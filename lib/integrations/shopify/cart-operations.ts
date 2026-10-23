import type { cookies } from 'next/headers'

import { removeEdgesAndNodes } from './adapters'
import { shopifyFetch } from './client'
import { TAGS } from './constants'
import {
  addToCartMutation,
  createCartMutation,
  editCartItemsMutation,
  removeFromCartMutation,
} from './mutations/cart'
import { getCartQuery } from './queries/cart'
import {
  type CartCreateResponseData,
  type CartLinesAddResponseData,
  type CartLinesRemoveResponseData,
  type CartLinesUpdateResponseData,
  cartCreateResponseSchema,
  cartLinesAddResponseSchema,
  cartLinesRemoveResponseSchema,
  cartLinesUpdateResponseSchema,
  type GetCartResponseData,
  getCartResponseSchema,
} from './schemas'
import type {
  Cart,
  CartLineInput,
  CartLineItem,
  ShopifyCart,
  ShopifyCartLineItem,
} from './types'

const toCartLineItem = (item: ShopifyCartLineItem): CartLineItem => ({
  id: item.id,
  quantity: item.quantity,
  cost: item.cost,
  merchandise: {
    ...item.merchandise,
    product: {
      ...item.merchandise.product,
      featuredImage: item.merchandise.product.featuredImage
        ? {
            ...item.merchandise.product.featuredImage,
            altText: item.merchandise.product.featuredImage.altText ?? '',
          }
        : null,
    },
  },
})

const toCart = (cart: ShopifyCart): Cart => {
  const totalTaxAmount = cart.cost?.totalTaxAmount ?? {
    amount: '0.0',
    currencyCode: 'USD',
  }

  const lines: CartLineItem[] = removeEdgesAndNodes(cart.lines).map(
    toCartLineItem
  )

  return {
    ...cart,
    cost: {
      ...cart.cost,
      totalTaxAmount,
    },
    lines,
  }
}

type CookieStore = Awaited<ReturnType<typeof cookies>>

/**
 * Sets the httpOnly `cartId` cookie. Shared by `addItem` and the
 * `/api/cart/ensure` route so the cookie config can't drift between them.
 */
export function setCartIdCookie(
  cookieStore: CookieStore,
  cartId: string
): void {
  cookieStore.set('cartId', cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export async function createCart(): Promise<Cart> {
  const res = await shopifyFetch<CartCreateResponseData>({
    query: createCartMutation,
    cache: 'no-store',
    dataSchema: cartCreateResponseSchema,
  })

  return toCart(res.body.data.cartCreate.cart)
}

export async function addToCart(
  cartId: string,
  lines: CartLineInput[] = []
): Promise<Cart> {
  const res = await shopifyFetch<CartLinesAddResponseData>({
    query: addToCartMutation,
    variables: {
      cartId,
      // Copied to plain objects: GraphQL variables are a JSON value bag.
      lines: lines.map((line) => ({ ...line })),
    },
    cache: 'no-store',
    dataSchema: cartLinesAddResponseSchema,
  })

  return toCart(res.body.data.cartLinesAdd.cart)
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[] = []
): Promise<Cart> {
  const res = await shopifyFetch<CartLinesRemoveResponseData>({
    query: removeFromCartMutation,
    variables: {
      cartId,
      lineIds,
    },
    cache: 'no-store',
    dataSchema: cartLinesRemoveResponseSchema,
  })

  return toCart(res.body.data.cartLinesRemove.cart)
}

interface CartLineUpdateInput {
  id: string
  merchandiseId: string
  quantity: number
}

export async function updateCart(
  cartId: string,
  lines: CartLineUpdateInput[] = []
): Promise<Cart> {
  const res = await shopifyFetch<CartLinesUpdateResponseData>({
    query: editCartItemsMutation,
    variables: {
      cartId,
      // Copied to plain objects: GraphQL variables are a JSON value bag.
      lines: lines.map((line) => ({ ...line })),
    },
    cache: 'no-store',
    dataSchema: cartLinesUpdateResponseSchema,
  })

  return toCart(res.body.data.cartLinesUpdate.cart)
}

export async function getCart(cartId: string): Promise<Cart | undefined> {
  const res = await shopifyFetch<GetCartResponseData>({
    query: getCartQuery,
    variables: { cartId },
    tags: [TAGS.cart],
    cache: 'no-store',
    dataSchema: getCartResponseSchema,
  })

  // Shopify nulls a cart once its checkout completes.
  if (!res.body.data.cart) {
    return undefined
  }

  return toCart(res.body.data.cart)
}
