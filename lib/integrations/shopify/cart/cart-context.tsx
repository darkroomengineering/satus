'use client'

import type { ReactNode } from 'react'
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

interface CartProviderProps {
  children: ReactNode
  cart?: Cart | undefined
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
