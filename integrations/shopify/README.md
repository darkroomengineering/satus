# Shopify Integration

E-commerce functionality integration with Shopify Storefront API.

## Features

- Shopping cart management
- Product catalog
- Customer accounts
- Optimistic UI updates
- Cart persistence (cookies)
- Checkout integration

## Environment Variables

```env
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="your-storefront-token"
SHOPIFY_REVALIDATION_SECRET="your-random-secret"
```

### Getting Credentials

1. **Store Domain**: Your Shopify store URL (e.g., `mystore.myshopify.com`)
2. **Storefront Access Token**: Shopify Admin → Settings → Apps and sales channels → Develop apps → Create custom app → Storefront API
3. **Revalidation Secret**: Generate random string for webhook security

## Usage

### Cart Setup

Wrap your app with the Cart provider:

```tsx
import { Cart } from '~/integrations/shopify/cart'

export default async function Layout({ children }) {
  return (
    <Cart>
      {children}
    </Cart>
  )
}
```

### Add to Cart

```tsx
import { AddToCart } from '~/integrations/shopify/cart/add-to-cart'

function ProductCard({ product, variant }) {
  return (
    <div>
      <h2>{product.title}</h2>
      <p>${variant.price.amount}</p>
      <AddToCart product={product} variant={variant} quantity={1} />
    </div>
  )
}
```

### Cart Context

Access cart state in any component:

```tsx
'use client'

import { useCartContext } from '~/integrations/shopify/cart/cart-context'

function CartButton() {
  const { cart, totalQuantity } = useCartContext()
  
  return (
    <button>
      Cart ({totalQuantity()})
    </button>
  )
}
```

### Cart Modal

Toggle cart modal:

```tsx
'use client'

import { useCartModal } from '~/integrations/shopify/cart/modal'

function OpenCartButton() {
  const { openCart } = useCartModal()
  
  return <button onClick={openCart}>Open Cart</button>
}
```

### Customer Authentication

```tsx
import { LoginCustomerAction, LogoutCustomerAction, CreateCustomerAction } from '~/integrations/shopify/customer/actions'
import { getCustomer } from '~/integrations/shopify/customer/actions'

// Server component
export default async function AccountPage() {
  const customer = await getCustomer()
  
  if (!customer) {
    return <LoginForm action={LoginCustomerAction} />
  }
  
  return <AccountDashboard customer={customer} />
}
```

### Fetching Products

```tsx
import { getProducts, getProduct, getCollections } from '~/integrations/shopify'

// Get all products
const products = await getProducts({ sortKey: 'CREATED_AT', reverse: true })

// Get single product
const product = await getProduct('product-handle')

// Get collections
const collections = await getCollections()
```

## GraphQL API

All queries and mutations use Shopify's Storefront GraphQL API:

**Queries**
- `getCartQuery` - Fetch cart by ID
- `getProductQuery` - Fetch single product
- `getProductsQuery` - Fetch multiple products
- `getCollectionQuery` - Fetch collection
- `getCollectionsQuery` - Fetch all collections
- `getCustomerQuery` - Fetch customer data

**Mutations**
- `createCartMutation` - Create new cart
- `addToCartMutation` - Add items to cart
- `removeFromCartMutation` - Remove items from cart
- `editCartItemsMutation` - Update item quantities
- `customerAccessTokenCreateMutation` - Customer login
- `customerCreateMutation` - Create customer account

## Cart Features

**Optimistic Updates**
- Immediate UI feedback
- Uses `useOptimistic` hook
- Automatically syncs with server

**Persistence**
- Cart ID stored in cookies
- Survives page refreshes
- Automatic cart recovery

**Actions**
- `addItem` - Add product to cart
- `removeItem` - Remove product from cart
- `updateItemQuantity` - Change quantity
- `fetchCart` - Get current cart state

## Best Practices

- Always wrap app with `<Cart>` provider
- Use server actions for cart mutations
- Handle loading states for cart operations
- Test checkout flow in Shopify admin
- Configure webhooks for revalidation

## Webhooks

Configure these webhooks in Shopify Admin → Settings → Notifications → Webhooks:

**Product Updates**
- URL: `https://your-domain.com/api/revalidate?secret=YOUR_SECRET`
- Events: `products/create`, `products/update`, `products/delete`

**Collection Updates**
- URL: `https://your-domain.com/api/revalidate?secret=YOUR_SECRET`
- Events: `collections/create`, `collections/update`, `collections/delete`

## Troubleshooting

**Cart not persisting**
- Check cookies are enabled
- Verify `cartId` cookie is set
- Check browser console for errors

**Products not loading**
- Verify `SHOPIFY_STORE_DOMAIN` format
- Check access token permissions
- Ensure products are published

**Checkout not working**
- Verify store is active
- Check payment gateway configuration
- Test with real products (not drafts)

## Related Documentation

- [Shopify Storefront API](https://shopify.dev/docs/api/storefront)
- [GraphQL Reference](https://shopify.dev/docs/api/storefront/latest)
- [Cart Context](cart/cart-context.tsx)

