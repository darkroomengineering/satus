// Catalog reads (products.ts, collections.ts, pages.ts) pass `tags` and a
// one-hour `revalidate` to shopifyFetch, so pages calling them can render
// statically; the webhook route invalidates them via revalidateTag() (see
// revalidate.ts). Cart operations (cart-operations.ts) are per-user and use
// cache: 'no-store'. Cost: a cart read can't be shared between visitors, so
// every cart view is a Shopify round trip.

export * from './cart-operations'
export * from './client'
export * from './collections'
export * from './pages'
export * from './products'
