import type { ReactNode } from 'react'
import type { Cart as CartData } from '~/integrations/shopify/types'
import { fetchCart } from './actions'
import { CartProvider } from './cart-context'

interface CartProps {
  children: ReactNode
}

export async function Cart({ children }: CartProps) {
  const cart = (await fetchCart()) as unknown

  return <CartProvider cart={cart as CartData}>{children}</CartProvider>
}

// Based on
// https://github.com/vercel/commerce/blob/main/components/cart/cart-context.tsx
