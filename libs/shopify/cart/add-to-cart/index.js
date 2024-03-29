'use client'

import cn from 'clsx'
import { Button } from 'components/button'
import { addItem } from 'libs/shopify/cart/actions'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useCartModal } from '../modal'
import s from './add-to-cart.module.scss'

export function AddToCart({ variants }) {
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
    <form action={actionWithVariant}>
      <ActionButton
        aria-label="Add to cart"
        defaultState=" 1440.00$ — ADD TO CART"
        pendingState="ADDING TO CART"
      />
    </form>
  )
}

function ActionButton({ defaultState, pendingState, ...props }) {
  const pendingStartRef = useRef(false)
  const { pending } = useFormStatus()
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
    <Button
      type="submit"
      onClick={(e) => {
        if (pending) {
          e.preventDefault()
        }
      }}
      aria-disabled={pending}
      {...props}
      className={cn(s.cta, pending && s.disable)}
      icon
    >
      {pending ? pendingState : defaultState}
    </Button>
  )
}
