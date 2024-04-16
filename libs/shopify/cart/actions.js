'use server'

import {
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  updateCart,
} from 'libs/shopify'
import { TAGS } from 'libs/shopify/constants'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'

export async function removeItem(lineId) {
  let cartId = cookies().get('cartId')?.value

  if (!cartId) {
    return 'Missing cart ID'
  }

  try {
    await removeFromCart(cartId, [lineId])
    revalidateTag(TAGS.cart)
  } catch (e) {
    return 'Error removing item from cart'
  }
}

export async function addItem(prevState, selectedVariantId) {
  let cartId = cookies().get('cartId')?.value
  let cart

  // This is here beacuse cookie can only be set server side
  // and useFormState executes the addItem action in the server
  if (!cartId) {
    cart = await createCart()
    cartId = cart.id
    cookies().set('cartId', cartId)
  }

  if (!selectedVariantId) {
    return 'Missing product variant ID'
  }

  try {
    await addToCart(cartId, [{ merchandiseId: selectedVariantId, quantity: 1 }])
    revalidateTag(TAGS.cart)
    return 'success'
  } catch (e) {
    return 'Error adding item to cart'
  }
}

export async function updateItemQuantity(
  payload = { lineId: '', variantId: '', quantity: '' },
) {
  let cartId = cookies().get('cartId')?.value

  if (!cartId) {
    return 'Missing cart ID'
  }

  const { lineId, variantId, quantity } = payload

  try {
    await updateCart(cartId, [
      {
        id: lineId,
        merchandiseId: variantId,
        quantity,
      },
    ])
    revalidateTag(TAGS.cart)
  } catch (e) {
    return 'Error updating item quantity'
  }
}

export async function fetchCart() {
  let cartId = cookies().get('cartId')?.value

  let cart

  if (cartId) {
    cart = await getCart(cartId)
  }

  return cart
}
