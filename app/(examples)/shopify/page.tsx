import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isShopifyConfigured } from '@/integrations/check-integration'
import { Cart } from '@/integrations/shopify/cart'
import { Product } from './_components/product'
import { ShowCart } from './_components/show-cart'

export default async function ShopifyPage() {
  // Show setup instructions if Shopify is not configured
  if (!isShopifyConfigured()) {
    return (
      <Wrapper theme="dark">
        <NotConfigured integration="Shopify" />
      </Wrapper>
    )
  }

  return (
    <Wrapper theme="dark" className="overflow-clip font-mono uppercase">
      <Cart>
        <ShowCart className="fixed top-safe right-safe" />
        <Product />
      </Cart>
    </Wrapper>
  )
}
