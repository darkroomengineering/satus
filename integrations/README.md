# Integrations

This directory contains integrations with external services and APIs used throughout the application. These integrations provide seamless connections to CMS, e-commerce, and marketing platforms.

## Available Integrations

- `hubspot/` - HubSpot integration for forms and marketing
- `storyblok/` - Storyblok CMS integration for content management
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
import { HubspotNewsletterAction } from '~/intergrations/hubspot/action'
import { HubspotForm } from '~/intergrations/hubspot/embed/form'

// Embed a HubSpot form
function NewsletterForm() {
  return <HubspotForm formId="your-form-id" />
}

// Handle form submission
async function handleSubmit(formData) {
  await HubspotNewsletterAction(formData)
}
```

## Storyblok Integration

The Storyblok integration provides headless CMS functionality.

### Features

- Content management
- Rich text rendering
- Dynamic page creation
- Visual editor compatibility
- Preview mode support

### Usage

```tsx
import { StoryblokProvider } from '~/intergrations/storyblok'
import { RichTextRenderer } from '~/intergrations/storyblok/renderer'

// Setup Storyblok Provider
function App({ children }) {
  return (
    <StoryblokProvider>
      {children}
    </StoryblokProvider>
  )
}

// Render content from Storyblok
function ContentBlock({ data }) {
  return <RichTextRenderer data={data.content} />
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
} from '~/intergrations/shopify/hooks'
import { AddToCart } from '~/intergrations/shopify/cart/add-to-cart'

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

## Configuration

Each integration requires specific configuration in the environment variables:

```
# HubSpot
HUBSPOT_ACCESS_TOKEN=your-token
HUBSPOT_PORTAL_ID=your-portal-id

# Storyblok
STORYBLOK_ACCESS_TOKEN=your-token
STORYBLOK_PREVIEW_TOKEN=your-preview-token

# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-token
```

See `.env.example` for all required environment variables.
