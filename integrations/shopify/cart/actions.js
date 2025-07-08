'use server'

import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { TAGS } from '../constants'
import {
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  updateCart,
} from '../index'

export async function removeItem(_prevState, merchandiseId) {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  if (!cartId) {
    return 'Missing cart ID'
  }

  try {
    const cart = await getCart(cartId)

    if (!cart) {
      return 'Error fetching cart'
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    )

    if (lineItem?.id) {
      await removeFromCart(cartId, [lineItem.id])
      revalidateTag(TAGS.cart)
    } else {
      return 'Item not found in cart'
    }
  } catch (_e) {
    return 'Error removing item from cart'
  }
}

export async function addItem(_prevState, { variantId, quantity = 1 }) {
  const _cookies = await cookies()
  let cartId = _cookies.get('cartId')?.value
  let cart

  // This is here beacuse cookie can only be set server side
  // and useFormState executes the addItem action in the server
  if (!cartId) {
    cart = await createCart()
    cartId = cart.id
    _cookies.set('cartId', cartId)
  }

  if (!variantId) {
    return 'Missing product variant ID'
  }

  try {
    await addToCart(cartId, [{ merchandiseId: variantId, quantity }])
    revalidateTag(TAGS.cart)

    return 'success'
  } catch (_e) {
    return 'Error adding item to cart'
  }
}

export async function updateItemQuantity(
  _prevState,
  payload = { merchandiseId: '', quantity: '' }
) {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

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
      (line) => line.merchandise.id === merchandiseId
    )

    await updateCart(cartId, [
      {
        id: lineItem.id,
        merchandiseId,
        quantity,
      },
    ])
    revalidateTag(TAGS.cart)
  } catch (_e) {
    return 'Error updating item quantity'
  }
}

export async function fetchCart() {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  let cart

  if (cartId) {
    cart = await getCart(cartId)
  }

  return cart
}
