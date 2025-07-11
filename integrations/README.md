# Integrations

This directory contains integrations with external services and APIs used throughout the application. These integrations provide seamless connections to CMS, e-commerce, and marketing platforms.

## Available Integrations

- `hubspot/` - HubSpot integration for forms and marketing
- `sanity/` - Sanity CMS integration for content management
- `shopify/` - Shopify integration for e-commerce functionality

## HubSpot Integration

The HubSpot integration provides form handling and marketing automation features.

### Features

- Form embedding and submission
- Contact management
- Marketing automation
- Newsletter subscription

### Usage

```tsx
import { HubspotNewsletterAction } from '~/integrations/hubspot/action'
import { HubspotForm } from '~/integrations/hubspot/embed/form'

// Embed a HubSpot form
function NewsletterForm() {
  return <HubspotForm formId="your-form-id" />
}

// Handle form submission
async function handleSubmit(formData) {
  await HubspotNewsletterAction(formData)
}
```

## Sanity Integration

The Sanity integration provides headless CMS functionality with visual editing capabilities.

### Features

- Content management with Sanity Studio
- Rich text rendering with Portable Text
- Visual editing and live preview
- Draft mode support
- Image optimization

### Usage

```tsx
import { fetchSanityPage, SanityContextProvider, RichText } from '~/integrations/sanity'

// Fetch content from Sanity
async function getPageData(slug: string) {
  const { data } = await fetchSanityPage(slug)
  return data
}

// Render content with context
function ContentPage({ data }) {
  return (
    <SanityContextProvider document={data}>
      <RichText content={data.content} />
    </SanityContextProvider>
  )
}
```

## Shopify Integration

The Shopify integration provides e-commerce functionality.

### Features

- Product catalog management
- Shopping cart functionality
- Customer account management
- Checkout process
- Order management

### Usage

```tsx
import { 
  useShopifyCart, 
  useShopifyProduct 
} from '~/integrations/shopify/hooks'
import { AddToCart } from '~/integrations/shopify/cart/add-to-cart'

// Use Shopify product data
function ProductDisplay({ handle }) {
  const { product, loading } = useShopifyProduct(handle)
  
  if (loading) return <Loading />
  
  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <span>${product.price}</span>
      <AddToCart product={product} />
    </div>
  )
}

// Access cart data
function CartSummary() {
  const { cart, isLoading } = useShopifyCart()
  
  if (isLoading) return <Loading />
  
  return (
    <div>
      <h2>Your Cart ({cart.totalItems})</h2>
      <ul>
        {cart.items.map(item => (
          <li key={item.id}>{item.title} - ${item.price}</li>
        ))}
      </ul>
      <p>Total: ${cart.totalPrice}</p>
    </div>
  )
}
```

## Environment Variables

```env
# HubSpot
HUBSPOT_ACCESS_TOKEN=your-token
HUBSPOT_PORTAL_ID=your-portal-id

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
SANITY_API_WRITE_TOKEN="your-viewer-token"

# Shopify
SHOPIFY_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_TOKEN="your-storefront-token"

```
