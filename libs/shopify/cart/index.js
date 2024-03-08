import { fetchCart } from './actions'
import { CartModal } from './modal'

export async function Cart({ children }) {
  const cart = await fetchCart()

  return <CartModal cart={cart}>{children}</CartModal>
}
