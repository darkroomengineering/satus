'use client'

import { createContext, use } from 'react'
import type { Cart, Product, ProductVariant } from '../types'

// Context state
export interface CartState {
  cart: Cart | undefined
}

// Context actions
export interface CartActions {
  updateCartItem: (
    merchandiseId: string,
    updateType: 'plus' | 'minus' | 'delete'
  ) => void
  addCartItem: (
    variant: ProductVariant | undefined,
    product: Product,
    quantity?: number
  ) => void
}

// Context meta (computed values)
export interface CartMeta {
  totalQuantity: () => number
}

// Context value shape
export type CartContextStandard = {
  state: CartState
  actions: CartActions
  meta?: CartMeta
}

export const CartContext = createContext<CartContextStandard | null>(null)

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
  const context = use(CartContext)
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider')
  }
  return context
}
