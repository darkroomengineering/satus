import { Wrapper } from '~/app/(pages)/_components/wrapper'
import { Cart } from '~/integrations/shopify/cart'
import { Product } from './_components/product'
import { ShowCart } from './_components/show-cart'

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
