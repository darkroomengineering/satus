import { shopifyFetch } from './client'
import { TAGS } from './constants'
import {
  addToCartMutation,
  createCartMutation,
  editCartItemsMutation,
  removeFromCartMutation,
} from './mutations/cart'
import { getCartQuery } from './queries/cart'
import { removeEdgesAndNodes } from './reshape'
import type {
  Cart,
  CartLineInput,
  CartLineItem,
  ShopifyCart,
  ShopifyCartLineItem,
} from './types'

const reshapeCartLineItem = (item: ShopifyCartLineItem): CartLineItem => ({
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

const reshapeCart = (cart: ShopifyCart): Cart => {
  const totalTaxAmount = cart.cost?.totalTaxAmount ?? {
    amount: '0.0',
    currencyCode: 'USD',
  }

  const lines: CartLineItem[] = removeEdgesAndNodes(cart.lines).map(
    reshapeCartLineItem
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

export async function createCart(): Promise<Cart> {
  const res = await shopifyFetch<{ cartCreate: { cart: ShopifyCart } }>({
    query: createCartMutation,
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartCreate.cart)
}

export async function addToCart(
  cartId: string,
  lines: CartLineInput[] = []
): Promise<Cart> {
  const res = await shopifyFetch<{ cartLinesAdd: { cart: ShopifyCart } }>({
    query: addToCartMutation,
    variables: {
      cartId,
      lines,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesAdd.cart)
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[] = []
): Promise<Cart> {
  const res = await shopifyFetch<{ cartLinesRemove: { cart: ShopifyCart } }>({
    query: removeFromCartMutation,
    variables: {
      cartId,
      lineIds,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesRemove.cart)
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
  const res = await shopifyFetch<{ cartLinesUpdate: { cart: ShopifyCart } }>({
    query: editCartItemsMutation,
    variables: {
      cartId,
      lines,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesUpdate.cart)
}

export async function getCart(cartId: string): Promise<Cart | undefined> {
  const res = await shopifyFetch<{ cart: ShopifyCart | null }>({
    query: getCartQuery,
    variables: { cartId },
    tags: [TAGS.cart],
    cache: 'no-store',
  })

  // Old carts becomes `null` when you checkout.
  if (!res.body.data.cart) {
    return undefined
  }

  return reshapeCart(res.body.data.cart)
}
