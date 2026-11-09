'use client'

import cn from 'clsx'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { formatMoney } from '@/integrations/shopify/money'
import type { Product, ProductVariant } from '@/integrations/shopify/types'

import { addItem } from '../actions'
import { useCartContext, useCartModal } from '../cart-context'
import { ensureCart } from '../ensure-cart'

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
  const { openCart, closeCart } = useCartModal()
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

  // The open drawer makes the page behind it inert, which hides this form's
  // error from screen readers. On failure, close it: focus returns to the
  // button beside the message, and the optimistic line has rolled back anyway.
  function fail(message: string) {
    setError(message)
    closeCart()
  }

  async function formAction() {
    startTransition(() => {
      addCartItem(variant, product, quantity)
      openCart()
    })

    // Cross-tab lock so simultaneous first-adds can't each create a cart and
    // orphan one's item. The action still creates a cart without it (no JS, no
    // Web Locks): protection, not a prerequisite, so a failure falls through.
    try {
      await ensureCart()
    } catch (lockError) {
      console.warn('Cart lock failed; adding without it:', lockError)
    }

    try {
      const result = await addItem(null, {
        variantId: variant?.id || '',
        quantity,
      })
      if (result.ok) setError(null)
      else fail(result.error)
    } catch (actionError) {
      // The action never ran (network down, deploy skew). Show it inline
      // instead of letting the rejection reach the route error boundary.
      console.error('Add to cart failed:', actionError)
      fail('Error adding item to cart')
    }
    // Not in a `finally`: React Compiler skips any component with one. Both
    // branches above handle their errors, so this always runs.
    router.refresh()
  }

  return (
    <form
      action={formAction}
      // Cleared here, not in `formAction`: updates inside an async form action
      // commit only when it finishes, so the old error would stay up during
      // the retry.
      onSubmit={() => setError(null)}
      className={className}
    >
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
