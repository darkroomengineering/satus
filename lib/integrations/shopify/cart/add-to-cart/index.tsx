'use client'

import cn from 'clsx'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { formatMoney } from '@/integrations/shopify/money'
import type { Product, ProductVariant } from '@/integrations/shopify/types'
import { addItem } from '../actions'
import { useCartContext } from '../cart-context'
import { useCartModal } from '../modal'
import s from './add-to-cart.module.css'

interface AddToCartProps {
  product: Product
  variant?: ProductVariant
  quantity?: number
  className?: string
}

export function AddToCart({
  product,
  variant,
  quantity = 1,
  className,
}: AddToCartProps) {
  const { actions } = useCartContext()
  const { addCartItem } = actions
  const { openCart } = useCartModal()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  let buttonState = 'Coming Soon'

  if (variant) {
    buttonState = variant.price
      ? `ADD TO CART — ${formatMoney(variant.price)}`
      : 'ADD TO CART'
  } else if (product?.availableForSale) {
    buttonState = 'Select a size'
  }

  async function formAction() {
    startTransition(() => {
      addCartItem(variant, product, quantity)
      openCart()
    })

    const result = await addItem(null, {
      variantId: variant?.id || '',
      quantity,
    })

    setError(result.ok ? null : result.error)

    // Refresh the router to sync server state with optimistic state
    router.refresh()
  }

  return (
    <form action={formAction} className={className}>
      <button
        type="submit"
        className={cn(s.cta, !variant && s.disable)}
        disabled={!variant}
        aria-label="Add to cart"
      >
        {buttonState}
      </button>
      {error && (
        <p role="status" aria-live="polite" className={cn('p1', s.actionError)}>
          {error}
        </p>
      )}
    </form>
  )
}
