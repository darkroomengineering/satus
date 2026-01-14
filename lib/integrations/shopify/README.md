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
import { Cart } from '@/lib/integrations/shopify/cart'

export default function Layout({ children }) {
  return <Cart>{children}</Cart>
}
```

### Add to Cart

```tsx
import { AddToCart } from '@/lib/integrations/shopify/cart/add-to-cart'

<AddToCart product={product} variant={variant} quantity={1} />
```

### Cart Context

```tsx
import { useCartContext } from '@/lib/integrations/shopify/cart/cart-context'

const { cart, totalQuantity } = useCartContext()
```

### Products

```tsx
import { getProducts, getProduct } from '@/lib/integrations/shopify'

const products = await getProducts({ sortKey: 'CREATED_AT' })
const product = await getProduct('product-handle')
```

## Features

- Optimistic UI updates
- Cart persistence (cookies)
- Customer authentication

## Caching

- **Cart data**: Never cached (user-specific)
- **Products**: Cached with `revalidateTag('products')`

## Webhooks

Configure in Shopify Admin for cache invalidation:

```
https://your-domain.com/api/revalidate?secret=YOUR_SECRET
```

Events: `products/create`, `products/update`, `products/delete`
