import type { Metadata } from 'next'
import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isConfigured } from '@/integrations/registry'
import { Cart } from '@/integrations/shopify/cart'
import { Product } from './_components/product'
import { ShowCart } from './_components/show-cart'

export const metadata: Metadata = {
  title: 'Shopify Integration — Satūs',
  description:
    'Example Shopify Storefront API integration: browse products and manage a cart with optimistic UI updates.',
}

export default async function ShopifyPage() {
  // Show setup instructions if Shopify is not configured
  if (!isConfigured('shopify')) {
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
