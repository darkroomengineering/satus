'use client'

import cn from 'clsx'
import { useRouter } from 'next/navigation'
import type { KeyboardEvent, ReactNode } from 'react'
import { createContext, use, useState } from 'react'
import { Image } from '@/components/ui/image'
import { Link } from '@/components/ui/link'
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
                {...(merchandise.product.featuredImage?.width && {
                  width: merchandise.product.featuredImage.width,
                })}
                {...(merchandise.product.featuredImage?.height && {
                  height: merchandise.product.featuredImage.height,
                })}
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
              merchandiseId={merchandise?.id ?? ''}
              lineId={id}
              className={s.remove ?? ''}
            />

            <Quantity
              className={s.quantity ?? ''}
              payload={{
                merchandiseId: merchandise?.id ?? '',
                quantity,
                lineId: id,
              }}
            />

            <p className={s.price}>
              $ {Number(cost?.totalAmount?.amount).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <div className={s.checkout}>
        <div className={s.top}>
          <p>sub total</p>
          <p>$ {Number(cart?.cost?.subtotalAmount?.amount).toFixed(2)}</p>
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

  async function formAction(type: 'minus' | 'plus') {
    const updatePayload = {
      ...payload,
      quantity: Math.max(1, payload.quantity + quantityAction[type]),
    }

    updateCartItem(payload.merchandiseId, type)
    await updateItemQuantity(null, updatePayload)

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
    </div>
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
      <button type="submit" className="p1" aria-label={ariaLabel}>
        {children}
      </button>
    </form>
  )
}

function RemoveButton({ merchandiseId, lineId, className }: RemoveButtonProps) {
  const { actions } = useCartContext()
  const { updateCartItem } = actions
  const router = useRouter()

  async function formAction() {
    updateCartItem(merchandiseId, 'delete')
    await removeItem(null, merchandiseId, lineId)

    // Refresh the router to sync server state with optimistic state
    router.refresh()
  }

  return (
    <form action={formAction} className={className}>
      <button type="submit" className="p1" aria-label="Remove cart item">
        remove
      </button>
    </form>
  )
}
