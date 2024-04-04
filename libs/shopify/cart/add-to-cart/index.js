'use client'

import cn from 'clsx'
import { addItem } from 'libs/shopify/cart/actions'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useCartModal } from '../modal'
import s from './add-to-cart.module.scss'

export function AddToCart({ variants, className }) {
  // eslint-disable-next-line no-unused-vars
  const [_, formAction] = useFormState(addItem, null)
  const searchParams = useSearchParams()

  const defaultVariantId = variants.length === 1 ? variants[0]?.id : undefined
  const variant = variants.find((variant) =>
    variant.selectedOptions.every(
      (option) => option.value === searchParams.get(option.name.toLowerCase()),
    ),
  )
  const selectedVariantId = variant?.id || defaultVariantId
  const actionWithVariant = formAction.bind(null, selectedVariantId)

  return (
    <form action={actionWithVariant} className={className}>
      <ActionButton
        aria-label="Add to cart"
        defaultState={`${variants[0]?.price?.amount}$ - ADD TO CART`}
        pendingState="ADDING TO CART"
      />
    </form>
  )
}

function ActionButton({ defaultState, pendingState, ...props }) {
  const pendingStartRef = useRef(false)
  const { pending = false } = useFormStatus()
  const openCart = useCartModal()

  useEffect(() => {
    if (pending) {
      pendingStartRef.current = true
    }

    if (pendingStartRef.current && !pending) {
      openCart('add')
      pendingStartRef.current = false
    }
  }, [pending, openCart])

  return (
    <button
      type="submit"
      onClick={(e) => {
        if (pending) {
          e.preventDefault()
        }
      }}
      aria-disabled={pending}
      {...props}
      className={cn(s.cta, pending && s.disable)}
    >
      {pending ? pendingState : defaultState}
    </button>
  )
}
