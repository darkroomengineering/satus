'use client'

import cn from 'clsx'
import { addItem } from 'libs/shopify/cart/actions'
import { useCartContext } from '../cart-context'
import { useCartModal } from '../modal'
import s from './add-to-cart.module.scss'

export function AddToCart({ product, variant, quantity = 1, className }) {
  const { addCartItem } = useCartContext()
  const { openCart } = useCartModal()

  const buttonState = variant
    ? `ADD TO CART — $${Number(variant?.price?.amount).toFixed(2)}`
    : product?.availableForSale
      ? 'Select a size'
      : 'Coming Soon'

  async function formAction() {
    // Need to force priority
    setTimeout(() => {
      addCartItem(variant, product, quantity)
      openCart('add')
    }, 0)

    await addItem(null, {
      variantId: variant?.id,
      quantity,
    })
  }

  return (
    <form action={formAction} className={className}>
      <button
        type="submit"
        className={cn(s.cta, !variant && s.disable)}
        aria-label="Add to cart"
      >
        {buttonState}
      </button>
    </form>
  )
}
