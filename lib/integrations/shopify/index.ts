// USAGE — Shopify Storefront API
// 1. Set env vars: SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN
//    Optionally: SHOPIFY_REVALIDATION_SECRET (to secure the webhook route)
//
// 2. Fetch products in a Server Component:
//
//   import { getCollectionProducts } from '@/integrations/shopify'
//
//   export default async function ShopPage() {
//     const products = await getCollectionProducts({ collection: 'frontpage' })
//     return products.map(p => <ProductCard key={p.id} product={p} />)
//   }
//
// 3. Wrap the page in <Cart> to enable the cart context and add-to-cart actions:
//
//   import { Cart } from '@/integrations/shopify/cart'
//   import { AddToCart } from '@/integrations/shopify/cart/add-to-cart'
//
//   export default async function ShopPage() {
//     const products = await getCollectionProducts({ collection: 'frontpage' })
//     return (
//       <Cart>
//         {products.map(p => (
//           <div key={p.id}>
//             <h2>{p.title}</h2>
//             <AddToCart product={p} variant={p.variants[0]} />
//           </div>
//         ))}
//       </Cart>
//     )
//   }
//
// Full walkthrough: see the manual (app/(site)/page.tsx) step 5 "Add a plugin".
//
// 4. Catalog reads (products.ts, collections.ts, pages.ts) are wrapped in
//    'use cache' with a one-hour cacheLife — required under Cache Components
//    so the pages calling them can render statically instead of opting into
//    fully dynamic rendering. That 'use cache' entry is the only cache layer:
//    the underlying shopifyFetch call passes cache: 'no-store' so the Data
//    Cache doesn't also hold its own indefinitely-cached copy underneath it.
//    The Shopify webhook route invalidates via revalidateTag() on
//    product/collection/page changes (see revalidate.ts). Cart operations
//    (cart-operations.ts) are per-user and deliberately left uncached
//    (cache: 'no-store') with no 'use cache' wrapper at all.

export * from './cart-operations'
export * from './client'
export * from './collections'
export * from './pages'
export * from './products'
