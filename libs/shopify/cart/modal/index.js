'use client'

import cn from 'clsx'
import { Image } from 'components/image'
import { Link } from 'components/link'
import { useBeforeUnload } from 'libs/shopify/hooks'
import { createContext, useContext, useOptimistic, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { removeItem, updateItemQuantity } from '../actions'
import s from './modal.module.scss'

const ModalContext = createContext()

export function CartModal({ children, cart }) {
  const [isOpen, setIsOpen] = useState(false)
  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)

  return (
    <ModalContext.Provider value={openCart}>
      {children}
      <div className={cn(s.modal, isOpen && s.open)}>
        <div className={s['catch-click']} onClick={closeCart} />
        <div className={s.inner}>
          <button className={cn('link', s.close)} onClick={closeCart}>
            close
          </button>
          {!cart || cart.lines.length === 0 ? (
            <EmptyCart />
          ) : (
            <InnerCart cart={cart} />
          )}
        </div>
      </div>
    </ModalContext.Provider>
  )
}

function EmptyCart() {
  return <p className={s.heading}>your cart is empty</p>
}

function InnerCart({ cart }) {
  return (
    <>
      <p className={s.heading}>your cart</p>
      <div className={s.lines} data-lenis-prevent>
        {cart?.lines?.map(({ id, merchandise, cost, quantity }, idx) => (
          <div className={s.line} key={`${idx}-${id}`}>
            <div className={s.media}>
              <Image
                src={merchandise?.product?.featuredImage?.url}
                alt={merchandise?.product?.featuredImage?.altText ?? ''}
                width={merchandise?.product?.featuredImage?.width}
                height={merchandise?.product?.featuredImage?.height}
              />
            </div>
            <div className={s.info}>
              <div className={s.details}>
                <p className={s.title}>{merchandise?.product?.title}</p>
                <p className={s.description}>
                  {merchandise?.product?.description}
                </p>
              </div>
              <p className={s.price}>$ {cost?.totalAmount?.amount}</p>
            </div>
            <RemoveButton id={id} className={s.remove} />
            <Quantity
              className={s.quantity}
              payload={{
                lineId: id,
                variantId: merchandise?.id,
                quantity,
              }}
            />
          </div>
        ))}
      </div>
      <div className={s.checkout}>
        <div className={s.top}>
          <p>sub total</p>
          <p>$ {cart?.cost?.subtotalAmount?.amount}</p>
        </div>
        <Link className={s.action} href={cart?.checkoutUrl}>
          <span> checkout</span>
        </Link>
      </div>
    </>
  )
}

function Quantity({ className, payload }) {
  const [quantity, setQuantity] = useOptimistic(
    payload.quantity,
    (state, newState) => newState,
  )

  async function formAction(value) {
    const newQuantity = Math.max(1, quantity + value)

    setQuantity(newQuantity)
    await updateItemQuantity({
      ...payload,
      quantity: newQuantity,
    })
  }

  return (
    <div className={className}>
      <QuantityButton formAction={() => formAction(-1)}>-</QuantityButton>
      <span>{quantity}</span>
      <QuantityButton formAction={() => formAction(1)}>+</QuantityButton>
    </div>
  )
}

function QuantityButton({ formAction, className, children }) {
  return (
    <form action={formAction} className={className}>
      <ActionButton>{children}</ActionButton>
    </form>
  )
}

function RemoveButton({ id, className }) {
  async function formAction() {
    await removeItem(id)
  }

  return (
    <form action={formAction} className={className}>
      <ActionButton className="link">remove</ActionButton>
    </form>
  )
}

function ActionButton({ children, className }) {
  const { pending = false } = useFormStatus()
  useBeforeUnload(pending)

  return (
    <button
      type="submit"
      onClick={(e) => {
        if (pending) {
          e.preventDefault()
        }
      }}
      className={cn(pending && s.disable, className)}
    >
      {children}
    </button>
  )
}

export function useCartModal() {
  return useContext(ModalContext)
}
