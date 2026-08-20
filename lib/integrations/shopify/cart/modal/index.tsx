'use client'

import cn from 'clsx'
import { useRouter } from 'next/navigation'
import type { KeyboardEvent, ReactNode } from 'react'
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'

import { Image } from '@/components/ui/image'
import { Link } from '@/components/ui/link'
import { formatMoney } from '@/integrations/shopify/money'
import type { CartLineItem } from '@/integrations/shopify/types'

import { removeItem, updateItemQuantity } from '../actions'
import { useCartContext } from '../cart-store-context'
import { quantityAction } from '../optimistic-utils'

import s from './modal.module.css'

interface ModalContextType {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const ModalContext = createContext<ModalContextType | null>(null)

/**
 * Throws outside `CartModal`, matching the sibling `useCartContext` pattern
 * (cart-store-context.ts) — a working-but-inert default (`isOpen: false`,
 * no-op openCart/closeCart) would silently no-op instead of surfacing the
 * missing provider.
 */
export function useCartModal(): ModalContextType {
  const context = use(ModalContext)
  if (!context) {
    throw new Error('useCartModal must be used within a CartModal')
  }
  return context
}

interface CartModalProps {
  children: ReactNode
}

export function CartModal({ children }: CartModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { state } = useCartContext()
  const { cart } = state
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const openCart = () => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    setIsOpen(true)
  }
  const closeCart = () => setIsOpen(false)

  // Move focus into the drawer on open, and back to whatever triggered it on
  // close — a hand-rolled dialog has no native focus management, so without
  // this the close button/steppers/checkout link are only reachable by tab
  // order, never announced as the new focus target.
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Escape closes the drawer, matching every native/Base UI dialog.
  useEffect(() => {
    if (!isOpen) return

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') closeCart()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  return (
    <ModalContext.Provider value={{ isOpen, openCart, closeCart }}>
      {children}
      {/* `inert` removes the whole closed drawer from tab order and the a11y
          tree in one property — closed-state controls must be unreachable,
          not merely visually hidden (see prior-M6). */}
      <div className={cn(s.modal, isOpen && s.open)} inert={!isOpen}>
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
            ref={closeButtonRef}
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
        {cart?.lines?.map((line) => (
          <CartLine key={line.id} line={line} />
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

/**
 * One cart line, with quantity steppers and a remove control.
 *
 * All three controls share a single `isPending` transition, so only one
 * mutation for this line can be in flight at a time. This is the fix for the
 * concurrent-mutation race: each control computes an ABSOLUTE target quantity
 * from `quantity` (the current render's value), so two overlapping clicks
 * (a fast +/− before the first resolves) would otherwise send conflicting
 * absolutes — e.g. 6 and 4 off a base of 5 — and whichever server response
 * landed last would win, never the intended value. Serialising per line means
 * the second click is disabled until the first settles and the displayed
 * quantity has advanced, so each mutation builds on the previous one.
 */
function CartLine({ line }: { line: CartLineItem }) {
  const { id, merchandise, cost, quantity } = line
  const { actions } = useCartContext()
  const { updateCartItem } = actions
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function changeQuantity(type: 'minus' | 'plus') {
    startTransition(async () => {
      updateCartItem(merchandise.id, type)
      const result = await updateItemQuantity(null, {
        merchandiseId: merchandise.id,
        quantity: Math.max(1, quantity + quantityAction[type]),
        lineId: id,
      })
      setError(result.ok ? null : result.error)
      // Sync server state with the optimistic update.
      router.refresh()
    })
  }

  function remove() {
    startTransition(async () => {
      updateCartItem(merchandise.id, 'delete')
      const result = await removeItem(null, merchandise.id, id)
      setError(result.ok ? null : result.error)
      router.refresh()
    })
  }

  return (
    <div className={s.line}>
      <div className={s.media}>
        <Image
          src={merchandise.product.featuredImage?.url ?? ''}
          alt={merchandise.product.featuredImage?.altText ?? ''}
          // The drawer is 75vw (mobile) / 50vw (desktop) and `.media`
          // spans 2 of its 6 columns, so a third of each.
          mobileSize="25vw"
          desktopSize="17vw"
          // Product shots vary in aspect and must not be cropped in the
          // cart. This has to be the prop, not CSS: Image writes
          // object-fit inline, which outranks any stylesheet rule.
          objectFit="contain"
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

      <div className={s.remove ?? ''}>
        <button
          type="button"
          className="p1"
          aria-label="Remove cart item"
          disabled={isPending}
          onClick={remove}
        >
          remove
        </button>
      </div>

      <div className={s.quantity ?? ''}>
        <button
          type="button"
          className="p1"
          aria-label="Decrease quantity"
          disabled={isPending}
          onClick={() => changeQuantity('minus')}
        >
          -
        </button>
        <span>{quantity}</span>
        <button
          type="button"
          className="p1"
          aria-label="Increase quantity"
          disabled={isPending}
          onClick={() => changeQuantity('plus')}
        >
          +
        </button>
        {error && (
          <p
            role="status"
            aria-live="polite"
            className={cn('p1', s.actionError)}
          >
            {error}
          </p>
        )}
      </div>

      <p className={s.price}>
        {cost?.totalAmount ? formatMoney(cost.totalAmount) : ''}
      </p>
    </div>
  )
}
