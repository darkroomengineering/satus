'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useOptimistic } from 'react'
import { CartModal } from './modal'
import type { CartAction } from './optimistic-utils'
import { cartReconciler } from './optimistic-utils'

export interface Cart {
  id?: string
  checkoutUrl: string
  totalQuantity: number
  lines: Array<{
    id?: string
    quantity: number
    cost: {
      totalAmount: {
        amount: string
        currencyCode: string
      }
    }
    merchandise: {
      id: string
      title: string
      selectedOptions: Array<{ name: string; value: string }>
      product: {
        id: string
        handle: string
        title: string
        featuredImage: unknown
      }
    }
  }>
  cost: {
    subtotalAmount: {
      amount: string
      currencyCode: string
    }
    totalAmount: {
      amount: string
      currencyCode: string
    }
    totalTaxAmount: {
      amount: string
      currencyCode: string
    }
  }
}

interface CartContextType {
  cart?: Cart
  updateCartItem: (
    merchandiseId: string,
    updateType: 'plus' | 'minus' | 'delete'
  ) => void
  addCartItem: (variant: unknown, product: unknown, quantity?: number) => void
  totalQuantity: () => number
}

const CartContext = createContext<CartContextType>({
  updateCartItem: () => {
    /* Default empty implementation */
  },
  addCartItem: () => {
    /* Default empty implementation */
  },
  totalQuantity: () => 0,
})

export function useCartContext(): CartContextType {
  return useContext(CartContext)
}

interface CartProviderProps {
  children: ReactNode
  cart?: Cart
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
