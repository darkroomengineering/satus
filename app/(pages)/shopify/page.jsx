import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { Cart } from '~/cms/shopify/cart'
import { Product } from './(components)/product'
import { ShowCart } from './(components)/show-cart'

export default async function Shopify() {
  return (
    <Wrapper theme="red" className="font-mono uppercase overflow-clip">
      <Cart>
        <ShowCart className="fixed top-page right-page" />
        <Product />
      </Cart>
    </Wrapper>
  )
}
