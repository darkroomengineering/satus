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
import { Form, Input, SubmitButton } from '~/components/form'
import { HubspotNewsletterAction } from '~/integrations/hubspot/action'
import { EmbedHubspotForm } from '~/integrations/hubspot/embed'

// Embedded HubSpot form
function EmbeddedForm() {
  return <EmbedHubspotForm formId="your-form-id" />
}

// Simple newsletter form using server action
function NewsletterForm() {
  return (
    <Form action="HubspotNewsletterAction" formId="your-form-id">
      <Input name="email" type="email" required />
      <SubmitButton>subscribe_</SubmitButton>
    </Form>
  )
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
import { SanityContextProvider, RichText } from '~/integrations/sanity'
import { sanityFetch } from '~/integrations/sanity/live'
import { pageQuery } from '~/integrations/sanity/queries'

export default async function Page() {
  const { data } = await sanityFetch({ query: pageQuery, params: { slug: 'home' } })
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
import { Cart } from '~/integrations/shopify/cart'
import { AddToCart } from '~/integrations/shopify/cart/add-to-cart'

export default async function Page() {
  return (
    <Cart>
      {/* Your UI that uses cart context */}
    </Cart>
  )
}

function BuyButton({ product, variant }) {
  return <AddToCart product={product} variant={variant} />
}
```

## Environment Variables

```env
# HubSpot
HUBSPOT_ACCESS_TOKEN=your-token
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-portal-id

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
SANITY_API_WRITE_TOKEN="your-write-token"

# Shopify
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="your-storefront-token"
SHOPIFY_REVALIDATION_SECRET="your-revalidation-secret"

```
