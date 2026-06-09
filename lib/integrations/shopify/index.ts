// USAGE — Shopify Storefront API
// 1. Set env vars: SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESS_TOKEN
//    Optionally: SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID, SHOPIFY_CUSTOMER_ACCOUNT_API_URL
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
//             <AddToCart variants={p.variants} />
//           </div>
//         ))}
//       </Cart>
//     )
//   }
//
// Full walkthrough: see the manual (app/page.tsx) step 5 "Add a plugin".

export * from './cart-operations'
export * from './client'
export * from './collections'
export * from './pages'
export * from './products'
