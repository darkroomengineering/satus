import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { Cart } from '~/integrations/shopify/cart'
import { Product } from './(components)/product'
import { ShowCart } from './(components)/show-cart'

export default async function Shopify() {
  return (
    <Wrapper theme="red" className="font-mono uppercase overflow-clip">
      <Cart>
        <ShowCart className="fixed top-safe right-safe" />
        <Product />
      </Cart>
    </Wrapper>
  )
}
