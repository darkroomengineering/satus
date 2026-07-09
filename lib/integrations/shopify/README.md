# Shopify Integration

E-commerce with Storefront API.

## Environment Variables

```env
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="your-token"
SHOPIFY_REVALIDATION_SECRET="your-secret"
```

## Usage

### Cart Provider

```tsx
import { Cart } from '@/integrations/shopify/cart'

export default function Layout({ children }) {
  return <Cart>{children}</Cart>
}
```

### Add to Cart

```tsx
import { AddToCart } from '@/integrations/shopify/cart/add-to-cart'

<AddToCart product={product} variant={variant} quantity={1} />
```

### Cart Context

```tsx
import { useCartContext } from '@/integrations/shopify/cart/cart-context'

const { state, actions, meta } = useCartContext()
const { cart } = state
const { addCartItem, updateCartItem } = actions
const quantity = meta.totalQuantity()
```

### Products

```tsx
import { getProducts, getProduct } from '@/integrations/shopify'

const products = await getProducts({ sortKey: 'CREATED_AT' })
const product = await getProduct('product-handle')
```

### Validation

All Shopify server actions validate input with Zod schemas:
- **Cart actions** (`addItem`, `updateItemQuantity`, `removeItem`): validate variant IDs, quantity bounds (1-99), rate limiting. `updateItemQuantity` and `removeItem` take the client-held `lineId` (the cart line's id) to patch that line directly. All three return `CartActionResult` — `{ ok: true }` on success, `{ ok: false; error: string }` on failure.
- **Customer actions** (`LoginCustomerAction`, `CreateCustomerAction`): validate email format, password length, rate limiting via `runFormAction`. `LoginCustomerAction` passes the strict limiter (5 req/min) to `runFormAction` to throttle brute-force attempts.
- **Error handling**: Cart actions use `CartActionResult`; customer actions return `FormState` objects; there is no `Error` instance wrapping

Env vars are validated via `shopifyEnvSchema` in the integration registry.
The GraphQL *envelope* (`data` / `errors` fields) is always validated at the boundary with `parseApiResponse` (`@/utils/validation`). *Payload* validation (the `data` field contents) is opt-in via `shopifyFetch`'s `dataSchema` parameter — every built-in call site (`products.ts`, `collections.ts`, `pages.ts`, `cart-operations.ts`, `customer/actions.ts`) passes one, validating against the loose Zod schemas in `schemas.ts`. When omitted, the payload is cast to the caller-supplied type — the caller is responsible for ensuring the shape matches.

## Features

- Optimistic UI updates
- Cart persistence (cookies)
- Customer authentication

## Caching

- **Cart data**: Never cached (user-specific)
- **Products**: Cached with `revalidateTag('products')`

## Webhooks

Configure in Shopify Admin (Settings → Notifications → Webhooks) for cache invalidation:

```
URL: https://your-domain.com/api/revalidate?secret=YOUR_SHOPIFY_REVALIDATION_SECRET
```

Shopify sends the webhook topic in the `x-shopify-topic` header and the secret as the `secret`
query param — `app/api/revalidate/route.ts` detects either signal and dispatches to
`revalidate()` in `lib/integrations/shopify/revalidate.ts`, which checks the secret against
`SHOPIFY_REVALIDATION_SECRET` and calls `revalidateTag`. The same route also serves Sanity's
webhook (see `app/api/README.md`); Shopify and Sanity requests are distinguished automatically,
so no separate endpoint is needed.

Events: `products/create`, `products/update`, `products/delete`, `collections/create`,
`collections/update`, `collections/delete`
