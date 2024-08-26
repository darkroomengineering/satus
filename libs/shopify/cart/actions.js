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

export async function removeItem(prevState, merchandiseId) {
  let cartId = cookies().get('cartId')?.value

  if (!cartId) {
    return 'Missing cart ID'
  }

  try {
    const cart = await getCart(cartId)

    if (!cart) {
      return 'Error fetching cart'
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId,
    )

    if (lineItem && lineItem.id) {
      await removeFromCart(cartId, [lineItem.id])
      revalidateTag(TAGS.cart)
    } else {
      return 'Item not found in cart'
    }
  } catch (e) {
    return 'Error removing item from cart'
  }
}

export async function addItem(prevState, { variantId, quantity = 1 }) {
  let cartId = cookies().get('cartId')?.value
  let cart

  // This is here beacuse cookie can only be set server side
  // and useFormState executes the addItem action in the server
  if (!cartId) {
    cart = await createCart()
    cartId = cart.id
    cookies().set('cartId', cartId)
  }

  if (!variantId) {
    return 'Missing product variant ID'
  }

  try {
    await addToCart(cartId, [{ merchandiseId: variantId, quantity }])
    revalidateTag(TAGS.cart)

    return 'success'
  } catch (e) {
    return 'Error adding item to cart'
  }
}

export async function updateItemQuantity(
  prevState,
  payload = { merchandiseId: '', quantity: '' },
) {
  let cartId = cookies().get('cartId')?.value

  if (!cartId) {
    return 'Missing cart ID'
  }

  try {
    const cart = await getCart(cartId)

    if (!cart) {
      return 'Error fetching cart'
    }

    const { merchandiseId, quantity } = payload

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId,
    )

    await updateCart(cartId, [
      {
        id: lineItem.id,
        merchandiseId,
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
