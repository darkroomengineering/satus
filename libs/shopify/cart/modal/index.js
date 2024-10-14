'use client'

import cn from 'clsx'
import { Image } from 'components/image'
import { Link } from 'components/link'
import { createContext, useContext, useState } from 'react'
import { removeItem, updateItemQuantity } from '../actions'
import { useCartContext } from '../cart-context'
import s from './modal.module.scss'

const ModalContext = createContext()

export function useCartModal() {
  return useContext(ModalContext)
}

export function CartModal({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const { cart } = useCartContext()
  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)

  return (
    <ModalContext.Provider value={{ isOpen, openCart, closeCart }}>
      {children}
      <div className={cn(s.modal, isOpen && s.open)}>
        <div className={s['catch-click']} onClick={closeCart} />
        <div className={s.inner}>
          <button className={cn('link', s.close)} onClick={closeCart}>
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
  const { cart } = useCartContext()

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
                <p className={s.size}>
                  SIZE: {merchandise?.selectedOptions?.[0]?.value}
                </p>
              </div>
            </div>

            <RemoveButton
              merchandiseId={merchandise?.id}
              className={s.remove}
            />

            <Quantity
              className={s.quantity}
              payload={{
                merchandiseId: merchandise?.id,
                quantity,
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
        <Link className={s.action} href={cart?.checkoutUrl}>
          <span> checkout</span>
        </Link>
      </div>
    </>
  )
}

const quantityAction = {
  minus: -1,
  plus: 1,
}

function Quantity({ className, payload }) {
  const { updateCartItem } = useCartContext()

  async function formAction(type) {
    const updatePayload = {
      ...payload,
      quantity: Math.max(1, payload.quantity + quantityAction[type]),
    }

    updateCartItem(payload.merchandiseId, type)
    await updateItemQuantity(null, updatePayload)
  }

  return (
    <div className={className}>
      <QuantityButton formAction={() => formAction('minus')}>-</QuantityButton>
      <span>{payload.quantity}</span>
      <QuantityButton formAction={() => formAction('plus')}>+</QuantityButton>
    </div>
  )
}

function QuantityButton({ formAction, className, children }) {
  return (
    <form action={formAction} className={className}>
      <button type="submit" className="p1" aria-label="Remove cart item">
        {children}
      </button>
    </form>
  )
}

function RemoveButton({ merchandiseId, className }) {
  const { updateCartItem } = useCartContext()

  async function formAction() {
    updateCartItem(merchandiseId, 'delete')
    await removeItem(null, merchandiseId)
  }

  return (
    <form action={formAction} className={className}>
      <button type="submit" className="p1" aria-label="Remove cart item">
        remove
      </button>
    </form>
  )
}
