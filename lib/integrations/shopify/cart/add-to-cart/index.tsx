'use client'

import cn from 'clsx'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { formatMoney } from '@/integrations/shopify/money'
import type { Product, ProductVariant } from '@/integrations/shopify/types'

import { addItem } from '../actions'
import { useCartContext } from '../cart-context'
import { ensureCart } from '../ensure-cart'
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

    // Create the cart first, behind a cross-tab lock, so two simultaneous
    // first-adds cannot each create one and orphan the loser's item. The
    // action still creates a cart when this is skipped (no JS, no Web Locks),
    // so this is protection, not a prerequisite.
    await ensureCart()

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
      <AddToCartSubmitButton
        disabled={!variant}
        className={cn(s.cta, !variant && s.disable)}
      >
        {buttonState}
      </AddToCartSubmitButton>
      {error && (
        <p role="status" aria-live="polite" className={cn('p1', s.actionError)}>
          {error}
        </p>
      )}
    </form>
  )
}

function AddToCartSubmitButton({
  disabled,
  className,
  children,
}: {
  disabled: boolean
  className?: string
  children: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className={className}
      disabled={disabled || pending}
      aria-label="Add to cart"
    >
      {children}
    </button>
  )
}
