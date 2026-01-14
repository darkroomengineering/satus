import type { ReactNode } from 'react'
import { fetchCart } from './actions'
import { CartProvider } from './cart-context'

interface CartProps {
  children: ReactNode
}

export async function Cart({ children }: CartProps) {
  const cart = await fetchCart()

  return <CartProvider cart={cart}>{children}</CartProvider>
}

// Based on
// https://github.com/vercel/commerce/blob/main/components/cart/cart-context.tsx
