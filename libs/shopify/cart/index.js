import { fetchCart } from './actions'
import { CartProvider } from './cart-context'

export async function Cart({ children }) {
  const cart = await fetchCart()

  return <CartProvider cart={cart}>{children}</CartProvider>
}

// Based on
// https://github.com/vercel/commerce/blob/main/components/cart/cart-context.tsx
