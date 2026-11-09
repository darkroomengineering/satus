'use client'

import cn from 'clsx'
import { useRouter } from 'next/navigation'
import type { FragmentInstance, KeyboardEvent, ReactNode } from 'react'
import { Fragment, useEffect, useRef, useState, useTransition } from 'react'

import { Image } from '@/components/ui/image'
import { Link } from '@/components/ui/link'
import { formatMoney } from '@/integrations/shopify/money'
import type { CartLineItem } from '@/integrations/shopify/types'

import { removeItem, updateItemQuantity } from '../actions'
import { useCartContext } from '../cart-store-context'
import { quantityAction } from '../optimistic-utils'

import s from './modal.module.css'

interface CartModalProps {
  children: ReactNode
  isOpen: boolean
  closeCart: () => void
}

export function CartModal({ children, isOpen, closeCart }: CartModalProps) {
  const { state } = useCartContext()
  const { cart } = state
  const dialogRef = useRef<HTMLDivElement>(null)
  const contentsRef = useRef<FragmentInstance>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  // Line errors live here, not in `CartLine`: a failed remove has already
  // unmounted its optimistically deleted line, and the restored line is a new
  // instance that would start with no error. The modal stays mounted.
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})

  function setLineError(lineId: string, message: string | null) {
    setLineErrors((previous) => {
      const rest = Object.fromEntries(
        Object.entries(previous).filter(([id]) => id !== lineId)
      )
      return message ? { ...rest, [lineId]: message } : rest
    })
  }

  // A hand-rolled dialog has no native focus management: move focus in on
  // open, make the page behind unreachable, and hand focus back to the
  // trigger on close. Not a native `<dialog>`: a closed one is
  // `display: none`, which cuts the slide-out short.
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    contentsRef.current?.focus()
    const restoreOutside = dialogRef.current
      ? inertOutside(dialogRef.current)
      : undefined

    return () => {
      // Before the focus call: an inert trigger can't take focus.
      restoreOutside?.()
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') closeCart()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeCart])

  return (
    <>
      {children}
      {/* `inert` makes the closed drawer's controls unreachable, not merely
          visually hidden. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        className={cn(s.modal, isOpen && s.open)}
        inert={!isOpen}
      >
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
          <Fragment ref={contentsRef}>
            <button
              type="button"
              className={cn('link', s.close)}
              onClick={closeCart}
            >
              close
            </button>
            {!cart || cart.lines.length === 0 ? (
              <EmptyCart />
            ) : (
              <InnerCart lineErrors={lineErrors} setLineError={setLineError} />
            )}
          </Fragment>
        </div>
      </div>
    </>
  )
}

/**
 * Sets `inert` on every element beside `node` and beside each of its ancestors
 * up to `<body>`, so Tab and assistive tech reach only the drawer. Returns the
 * undo, which leaves alone anything that was inert already. An element added
 * outside while the drawer is open (a body portal) stays reachable.
 */
function inertOutside(node: HTMLElement): () => void {
  const marked: Element[] = []
  let current: HTMLElement = node
  while (current !== document.body && current.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (sibling === current || sibling.hasAttribute('inert')) continue
      sibling.setAttribute('inert', '')
      marked.push(sibling)
    }
    current = current.parentElement
  }
  return () => {
    for (const element of marked) element.removeAttribute('inert')
  }
}

function EmptyCart() {
  return <p className={s.heading}>your cart is empty</p>
}

interface LineErrorProps {
  lineErrors: Record<string, string>
  setLineError: (lineId: string, message: string | null) => void
}

function InnerCart({ lineErrors, setLineError }: LineErrorProps) {
  const { state } = useCartContext()
  const { cart } = state

  return (
    <>
      <p className={s.heading}>your cart</p>
      <div className={s.lines} data-lenis-prevent>
        {cart?.lines?.map((line) => (
          <CartLine
            key={line.id}
            line={line}
            error={lineErrors[line.id] ?? null}
            setLineError={setLineError}
          />
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
 * One cart line. All three controls share one `isPending` transition, so only
 * one mutation per line is in flight. Each control sends an ABSOLUTE target
 * quantity computed from the current render, so two overlapping clicks would
 * send conflicting absolutes (6 and 4 off a base of 5) and the last response
 * would win. Disabling controls until the first settles makes each mutation
 * build on the previous one.
 */
function CartLine({
  line,
  error,
  setLineError,
}: {
  line: CartLineItem
  error: string | null
  setLineError: LineErrorProps['setLineError']
}) {
  const { id, merchandise, cost, quantity } = line
  const { actions } = useCartContext()
  const { updateCartItem } = actions
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeQuantity(type: 'minus' | 'plus') {
    setLineError(id, null)
    startTransition(async () => {
      updateCartItem(merchandise.id, type)
      const result = await updateItemQuantity(null, {
        merchandiseId: merchandise.id,
        quantity: Math.max(1, quantity + quantityAction[type]),
        lineId: id,
      })
      setLineError(id, result.ok ? null : result.error)
      router.refresh()
    })
  }

  function remove() {
    setLineError(id, null)
    startTransition(async () => {
      updateCartItem(merchandise.id, 'delete')
      const result = await removeItem(null, merchandise.id, id)
      setLineError(id, result.ok ? null : result.error)
      router.refresh()
    })
  }

  return (
    <div className={s.line}>
      <div className={s.media}>
        <Image
          src={merchandise.product.featuredImage?.url ?? ''}
          alt={merchandise.product.featuredImage?.altText ?? ''}
          // The drawer is 75vw (mobile) / 50vw (desktop); `.media` spans 2 of
          // its 6 columns.
          mobileSize="25vw"
          desktopSize="17vw"
          // The prop, not CSS: Image writes object-fit inline, which outranks
          // any stylesheet rule.
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
