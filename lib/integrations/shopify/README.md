# Shopify Integration

E-commerce with the Storefront API.

## Environment Variables

```env
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="your-token"
SHOPIFY_REVALIDATION_SECRET="your-webhook-signing-secret"
```

Validated by `shopifyEnvSchema` in the registry.

## Usage

```tsx
import { Cart } from '@/integrations/shopify/cart'                        // provider, wrap the layout
import { AddToCart } from '@/integrations/shopify/cart/add-to-cart'       // <AddToCart product variant quantity />
import { useCartContext } from '@/integrations/shopify/cart/cart-context'
import { getProducts, getProduct } from '@/integrations/shopify'

const { state, actions, meta } = useCartContext()
// state.cart; actions.addCartItem, actions.updateCartItem; meta.totalQuantity()

const products = await getProducts({ sortKey: 'CREATED_AT' })
const product = await getProduct({ handle: 'product-handle' })
```

Cart state persists in cookies with optimistic UI updates.

### Validation

- **Cart actions**: `addItem` validates the variant id and a quantity of 1–99 with Zod. `updateItemQuantity` accepts a quantity of 0–99 (0 removes the line). `removeItem` takes the client-held `lineId` and checks only that it is present; there is no Zod schema for it. All three return `CartActionResult`: `{ ok: true }` on success, `{ ok: false; error: string }` on failure. No `Error` instance wrapping.
- **Customer actions** (`LoginCustomerAction`, `CreateCustomerAction`): validate email format and password length, and rate limit via `runFormAction`; they return `FormState`. `LoginCustomerAction` passes the strict limiter (5 req/min) to throttle brute-force attempts. These actions ship unwired: no route or component in this repo calls them, and a client build that needs customer accounts adds the route and UI.
- **API responses**: the GraphQL _envelope_ (`data` / `errors`) is always validated with `parseApiResponse` (`@/utils/validation`). _Payload_ validation (the `data` contents) is opt-in via `shopifyFetch`'s `dataSchema` parameter. Every built-in call site (`products.ts`, `collections.ts`, `pages.ts`, `cart-operations.ts`, `customer/actions.ts`) passes one, validating against the loose Zod schemas in `schemas.ts`. When omitted, the payload is cast to the caller-supplied type and the caller owns the shape.

## Caching

- **Cart data**: never cached (user-specific); every `cart-operations.ts` fetch passes `cache: 'no-store'`.
- **Products, collections, pages**: every exported reader in `products.ts`, `collections.ts`, and `pages.ts` passes `tags` and `revalidate: CATALOG_REVALIDATE_SECONDS` (one hour, `constants.ts`) to `shopifyFetch`, which caches the response in Next's Data Cache, so a page that calls them can still render statically. Invalidated by `revalidateTag('products' | 'collections' | 'pages', { expire: 0 })` from the webhook below, so the next visit gets fresh prices and stock; the one-hour `revalidate` is the backstop for a lost webhook.

## Webhooks

In Shopify Admin (Settings → Notifications → Webhooks), create one webhook per event below with URL `https://your-domain.com/api/revalidate`, format JSON. The same page shows the key Shopify signs these webhooks with; set `SHOPIFY_REVALIDATION_SECRET` to that key. Webhooks registered by an app are signed with the app's client secret instead.

`app/api/revalidate/route.ts` recognizes Shopify by the `x-shopify-hmac-sha256` or `x-shopify-topic` header and dispatches to `revalidate()` in `lib/integrations/shopify/revalidate.ts`. It computes the base64 HMAC-SHA256 of the raw body with `SHOPIFY_REVALIDATION_SECRET`, compares it with the `X-Shopify-Hmac-Sha256` header in constant time, and calls `revalidateTag(tag, { expire: 0 })`, so the next request after a product, collection or page change gets fresh data. A missing or wrong signature gets 401; an unset secret gets 503. It then requires `X-Shopify-Triggered-At` to be within 5 minutes of now and skips a delivery whose signature or `X-Shopify-Webhook-Id` it has already accepted. A missing, unparseable or stale timestamp, and a duplicate, each get 200 with no revalidation: Shopify keeps the original trigger time on retries, so an error would only make it retry in vain and risk removing the subscription. Those headers are not part of the signature, so this stops a captured request replayed unchanged, not one with edited headers; the seen-set lives in instance memory, so a replay that reaches another serverless instance is only caught by the timestamp. A delivery Shopify retries after more than 5 minutes revalidates nothing; the hourly `revalidate` backstop covers it. The same route serves Sanity's webhook (see `app/api/README.md`).

Events: `products/create`, `products/update`, `products/delete`, `collections/create`,
`collections/update`, `collections/delete`, `pages/create`, `pages/update`, `pages/delete`
