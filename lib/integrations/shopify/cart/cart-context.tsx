'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useOptimistic } from 'react'
import type { StandardContext } from '@/utils/context'
import type { Cart } from '../types'
import { CartModal } from './modal'
import type { CartAction } from './optimistic-utils'
import { cartReconciler } from './optimistic-utils'

// Standard context state
export interface CartState {
  cart: Cart | undefined
}

// Standard context actions
export interface CartActions {
  updateCartItem: (
    merchandiseId: string,
    updateType: 'plus' | 'minus' | 'delete'
  ) => void
  addCartItem: (variant: unknown, product: unknown, quantity?: number) => void
}

// Standard context meta (computed values)
export interface CartMeta {
  totalQuantity: () => number
}

// Standard context type
export type CartContextStandard = StandardContext<
  CartState,
  CartActions,
  CartMeta
>

/**
 * @deprecated Use CartContextStandard for new implementations.
 * This type is kept for backward compatibility.
 */
export interface CartContextType {
  cart?: Cart | undefined
  updateCartItem: (
    merchandiseId: string,
    updateType: 'plus' | 'minus' | 'delete'
  ) => void
  addCartItem: (variant: unknown, product: unknown, quantity?: number) => void
  totalQuantity: () => number
}

interface CartProviderProps {
  children: ReactNode
  cart?: Cart | undefined
}

const CartContext = createContext<CartContextStandard | null>(null)

/**
 * Hook to access the cart context with standard structure.
 * Returns { state, actions, meta } for new implementations.
 *
 * @example
 * ```tsx
 * const { state, actions, meta } = useCartContext()
 * const { cart } = state
 * const { addCartItem, updateCartItem } = actions
 * const quantity = meta?.totalQuantity()
 * ```
 */
export function useCartContext(): CartContextStandard {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider')
  }
  return context
}

/**
 * @deprecated Use useCartContext() which returns { state, actions, meta }.
 * This hook is kept for backward compatibility.
 */
export function useCartContextLegacy(): CartContextType {
  const { state, actions, meta } = useCartContext()
  return {
    cart: state.cart,
    ...actions,
    totalQuantity: meta?.totalQuantity ?? (() => 0),
  }
}

export function CartProvider({ children, cart }: CartProviderProps) {
  const [optimisticCart, updateOptimisticCart] = useOptimistic(
    cart,
    cartReconciler
  )

  function updateCartItem(
    merchandiseId: string,
    updateType: 'plus' | 'minus' | 'delete'
  ) {
    updateOptimisticCart({
      type: 'UPDATE_ITEM',
      payload: { merchandiseId, updateType },
    })
  }

  function addCartItem(variant: unknown, product: unknown, quantity = 1) {
    updateOptimisticCart({
      type: 'ADD_ITEM',
      payload: { variant, product, quantity },
    } as CartAction)
  }

  function totalQuantity() {
    return (
      optimisticCart?.lines?.reduce((acc, line) => acc + line.quantity, 0) ?? 0
    )
  }

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

  return (
    <CartContext.Provider value={contextValue}>
      <CartModal>{children}</CartModal>
    </CartContext.Provider>
  )
}
