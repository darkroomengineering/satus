'use client'

import { createContext, use } from 'react'
import type { StandardContext } from '@/utils/context'
import type { Cart, Product, ProductVariant } from '../types'

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
  addCartItem: (
    variant: ProductVariant | undefined,
    product: Product,
    quantity?: number
  ) => void
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
