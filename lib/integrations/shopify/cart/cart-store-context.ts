'use client'

import { createContext, use } from 'react'

import type { Cart, Product, ProductVariant } from '../types'

export interface CartState {
  cart: Cart | undefined
}

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

export interface CartMeta {
  totalQuantity: () => number
}

export type CartContextStandard = {
  state: CartState
  actions: CartActions
  meta: CartMeta
}

export const CartContext = createContext<CartContextStandard | null>(null)

export function useCartContext(): CartContextStandard {
  const context = use(CartContext)
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider')
  }
  return context
}
