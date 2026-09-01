'use client'

import { createContext, type ReactNode, use, useState } from 'react'
import { useOptimistic } from 'react'

import type { Cart, Product, ProductVariant } from '../types'
import {
  type CartActions,
  CartContext,
  type CartContextStandard,
  type CartMeta,
  type CartState,
} from './cart-store-context'
import { CartModal } from './modal'
import { cartReconciler } from './optimistic-utils'

export { useCartContext } from './cart-store-context'
// Re-export types and hook so existing import paths keep working
export type { CartActions, CartContextStandard, CartMeta, CartState }

interface CartModalContextType {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartModalContext = createContext<CartModalContextType | null>(null)

/**
 * Throws outside `CartProvider`, matching the sibling `useCartContext`
 * pattern (cart-store-context.ts) — a working-but-inert default
 * (`isOpen: false`, no-op openCart/closeCart) would silently no-op instead
 * of surfacing the missing provider.
 */
export function useCartModal(): CartModalContextType {
  const context = use(CartModalContext)
  if (!context) {
    throw new Error('useCartModal must be used within a CartProvider')
  }
  return context
}

interface CartProviderProps {
  children: ReactNode
  cart?: Cart | undefined
}

export function CartProvider({ children, cart }: CartProviderProps) {
  const [optimisticCart, updateOptimisticCart] = useOptimistic(
    cart,
    cartReconciler
  )
  const [isOpen, setIsOpen] = useState(false)

  function updateCartItem(
    merchandiseId: string,
    updateType: 'plus' | 'minus' | 'delete'
  ) {
    updateOptimisticCart({
      type: 'UPDATE_ITEM',
      payload: { merchandiseId, updateType },
    })
  }

  function addCartItem(
    variant: ProductVariant | undefined,
    product: Product,
    quantity = 1
  ) {
    if (!variant) return

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

  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)

  const contextValue: CartContextStandard = {
    state: {
      cart: optimisticCart,
    },
    actions: {
      updateCartItem,
      addCartItem,
    },
    meta: {
      totalQuantity,
    },
  }

  const modalContextValue: CartModalContextType = {
    isOpen,
    openCart,
    closeCart,
  }

  return (
    <CartContext.Provider value={contextValue}>
      <CartModalContext.Provider value={modalContextValue}>
        <CartModal isOpen={isOpen} closeCart={closeCart}>
          {children}
        </CartModal>
      </CartModalContext.Provider>
    </CartContext.Provider>
  )
}
