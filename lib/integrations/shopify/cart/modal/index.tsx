'use client'

import cn from 'clsx'
import { useRouter } from 'next/navigation'
import type { KeyboardEvent, ReactNode } from 'react'
import { createContext, use, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Image } from '@/components/ui/image'
import { Link } from '@/components/ui/link'
import { formatMoney } from '@/integrations/shopify/money'
import { removeItem, updateItemQuantity } from '../actions'
import { useCartContext } from '../cart-store-context'
import { quantityAction } from '../optimistic-utils'
import s from './modal.module.css'

interface ModalContextType {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

interface QuantityPayload {
  merchandiseId: string
  quantity: number
  lineId?: string | undefined
}

interface QuantityProps {
  className?: string
  payload: QuantityPayload
}

interface QuantityButtonProps {
  formAction: () => void
  className?: string
  children: ReactNode
  'aria-label': string
}

interface RemoveButtonProps {
  merchandiseId: string
  lineId?: string | undefined
  className?: string
}

const ModalContext = createContext<ModalContextType>({
  isOpen: false,
  openCart: () => {
    /* Default empty implementation */
  },
  closeCart: () => {
    /* Default empty implementation */
  },
})

export function useCartModal(): ModalContextType {
  return use(ModalContext)
}

interface CartModalProps {
  children: ReactNode
}

export function CartModal({ children }: CartModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { state } = useCartContext()
  const { cart } = state
  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)

  return (
    <ModalContext.Provider value={{ isOpen, openCart, closeCart }}>
      {children}
      <div className={cn(s.modal, isOpen && s.open)}>
        <button
          className={s['catch-click']}
          onClick={closeCart}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              closeCart()
            }
          }}
          type="button"
        >
          <span className="sr-only">Close cart</span>
        </button>
        <div className={s.inner}>
          <button
            type="button"
            className={cn('link', s.close)}
            onClick={closeCart}
          >
            close
          </button>
          {!cart || cart.lines.length === 0 ? <EmptyCart /> : <InnerCart />}
        </div>
      </div>
    </ModalContext.Provider>
  )
}

function EmptyCart() {
  return <p className={s.heading}>your cart is empty</p>
}

function InnerCart() {
  const { state } = useCartContext()
  const { cart } = state

  return (
    <>
      <p className={s.heading}>your cart</p>
      <div className={s.lines} data-lenis-prevent>
        {cart?.lines?.map(({ id, merchandise, cost, quantity }) => (
          <div className={s.line} key={id}>
            <div className={s.media}>
              <Image
                src={merchandise.product.featuredImage?.url ?? ''}
                alt={merchandise.product.featuredImage?.altText ?? ''}
                {...(merchandise.product.featuredImage?.width &&
                merchandise.product.featuredImage?.height
                  ? {
                      width: merchandise.product.featuredImage.width,
                      height: merchandise.product.featuredImage.height,
                    }
                  : // Shopify doesn't guarantee image dimensions — fall back
                    // to a square box so the cart line keeps a stable layout.
                    { aspectRatio: 1 })}
              />
            </div>

            <div className={s.info}>
              <div className={s.details}>
                <p className={s.title}>{merchandise?.product?.title}</p>
                <p className={s.size}>
                  SIZE: {merchandise?.selectedOptions?.[0]?.value}
                </p>
              </div>
            </div>

            <RemoveButton
              merchandiseId={merchandise.id}
              lineId={id}
              className={s.remove ?? ''}
            />

            <Quantity
              className={s.quantity ?? ''}
              payload={{
                merchandiseId: merchandise.id,
                quantity,
                lineId: id,
              }}
            />

            <p className={s.price}>
              {cost?.totalAmount ? formatMoney(cost.totalAmount) : ''}
            </p>
          </div>
        ))}
      </div>
      <div className={s.checkout}>
        <div className={s.top}>
          <p>sub total</p>
          <p>
            {cart?.cost?.subtotalAmount
              ? formatMoney(cart.cost.subtotalAmount)
              : ''}
          </p>
        </div>
        {cart?.checkoutUrl && (
          <Link className={s.action} href={cart.checkoutUrl}>
            <span> checkout</span>
          </Link>
        )}
      </div>
    </>
  )
}

function Quantity({ className, payload }: QuantityProps) {
  const { actions } = useCartContext()
  const { updateCartItem } = actions
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function formAction(type: 'minus' | 'plus') {
    const updatePayload = {
      ...payload,
      quantity: Math.max(1, payload.quantity + quantityAction[type]),
    }

    updateCartItem(payload.merchandiseId, type)
    const result = await updateItemQuantity(null, updatePayload)

    setError(result.ok ? null : result.error)

    // Refresh the router to sync server state with optimistic state
    router.refresh()
  }

  return (
    <div className={className}>
      <QuantityButton
        formAction={() => formAction('minus')}
        aria-label="Decrease quantity"
      >
        -
      </QuantityButton>
      <span>{payload.quantity}</span>
      <QuantityButton
        formAction={() => formAction('plus')}
        aria-label="Increase quantity"
      >
        +
      </QuantityButton>
      {error && (
        <p role="status" aria-live="polite" className={cn('p1', s.actionError)}>
          {error}
        </p>
      )}
    </div>
  )
}

function QuantitySubmitButton({
  children,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  'aria-label': string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="p1"
      aria-label={ariaLabel}
      disabled={pending}
    >
      {children}
    </button>
  )
}

function QuantityButton({
  formAction,
  className,
  children,
  'aria-label': ariaLabel,
}: QuantityButtonProps) {
  return (
    <form action={formAction} className={className}>
      <QuantitySubmitButton aria-label={ariaLabel}>
        {children}
      </QuantitySubmitButton>
    </form>
  )
}

function RemoveSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="p1"
      aria-label="Remove cart item"
      disabled={pending}
    >
      remove
    </button>
  )
}

function RemoveButton({ merchandiseId, lineId, className }: RemoveButtonProps) {
  const { actions } = useCartContext()
  const { updateCartItem } = actions
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function formAction() {
    updateCartItem(merchandiseId, 'delete')
    const result = await removeItem(null, merchandiseId, lineId)

    setError(result.ok ? null : result.error)

    // Refresh the router to sync server state with optimistic state
    router.refresh()
  }

  return (
    <div className={className}>
      <form action={formAction}>
        <RemoveSubmitButton />
      </form>
      {error && (
        <p role="status" aria-live="polite" className={cn('p1', s.actionError)}>
          {error}
        </p>
      )}
    </div>
  )
}
