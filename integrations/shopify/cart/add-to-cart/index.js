'use client'

import cn from 'clsx'
import { addItem } from '../actions'
import { useCartContext } from '../cart-context'
import { useCartModal } from '../modal'
import s from './add-to-cart.module.css'

export function AddToCart({ product, variant, quantity = 1, className }) {
  const { addCartItem } = useCartContext()
  const { openCart } = useCartModal()

  let buttonState = 'Coming Soon'

  if (variant) {
    buttonState = `ADD TO CART — $${Number(variant?.price?.amount).toFixed(2)}`
  } else if (product?.availableForSale) {
    buttonState = 'Select a size'
  }

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
