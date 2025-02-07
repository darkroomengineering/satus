'use client'

import { createContext, useContext, useOptimistic } from 'react'
import { CartModal } from './modal'
import { cartReconciler } from './optimistic-utils'

const CartContext = createContext({})

export function useCartContext() {
  return useContext(CartContext)
}

export function CartProvider({ children, cart }) {
  const [optimisticCart, updateOptimisticCart] = useOptimistic(
    cart,
    cartReconciler
  )

  function updateCartItem(merchandiseId, updateType) {
    updateOptimisticCart({
      type: 'UPDATE_ITEM',
      payload: { merchandiseId, updateType },
    })
  }

  function addCartItem(variant, product, quantity = 1) {
    updateOptimisticCart({
      type: 'ADD_ITEM',
      payload: { variant, product, quantity },
    })
  }

  function totalQuantity() {
    return (
      optimisticCart?.lines?.reduce((acc, line) => acc + line.quantity, 0) ?? 0
    )
  }

  return (
    <CartContext.Provider
      value={{
        cart: optimisticCart,
        updateCartItem,
        addCartItem,
        totalQuantity,
      }}
    >
      <CartModal>{children}</CartModal>
    </CartContext.Provider>
  )
}
