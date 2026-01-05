# Integrations

This directory contains integrations with external services and APIs used throughout the application. These integrations provide seamless connections to CMS, e-commerce, and marketing platforms.

## Available Integrations

- `hubspot/` - HubSpot forms and marketing ([Documentation](hubspot/README.md))
- `mailchimp/` - Email marketing ([Documentation](mailchimp/README.md))
- `mandrill/` - Transactional emails ([Documentation](mandrill/README.md))
- `sanity/` - Headless CMS ([Documentation](sanity/README.md))
- `shopify/` - E-commerce ([Documentation](shopify/README.md))
- `check-integration.ts` - Integration detection utilities

## HubSpot Integration

Form handling and marketing automation. [Full Documentation →](hubspot/README.md)

**Quick Example:**
```tsx
import { EmbedHubspotForm } from '~/lib/integrations/hubspot/embed'

<EmbedHubspotForm formId="your-form-id" />
```

## Sanity Integration

Headless CMS with visual editing. [Full Documentation →](sanity/README.md)

**Quick Example:**
```tsx
import { sanityFetch } from '~/lib/integrations/sanity/live'
import { RichText } from '~/lib/integrations/sanity'

const { data } = await sanityFetch({ query: pageQuery })
return <RichText content={data.content} />
```

## Shopify Integration

E-commerce with cart and checkout. [Full Documentation →](shopify/README.md)

**Quick Example:**
```tsx
import { Cart } from '~/lib/integrations/shopify/cart'
import { AddToCart } from '~/lib/integrations/shopify/cart/add-to-cart'

<Cart>
  <AddToCart product={product} variant={variant} />
</Cart>
```

## Mailchimp Integration

Email marketing and audience building. [Full Documentation →](mailchimp/README.md)

**Quick Example:**
```tsx
import { mailchimpSubscriptionAction } from '~/lib/integrations/mailchimp/action'

<Form action={mailchimpSubscriptionAction}>
  <Input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

## Mandrill Integration

Transactional emails via Mandrill. [Full Documentation →](mandrill/README.md)

**Quick Example:**
```tsx
import { combinedContactAction } from '~/lib/integrations/mandrill/action'

<Form action={combinedContactAction}>
  <Input name="name" required />
  <Input name="email" type="email" required />
  <Input name="subject" required />
  <Textarea name="message" required />
  <SubmitButton>Send</SubmitButton>
</Form>
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

# Mailchimp
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_AUDIENCE_ID=your-audience-id

# Mandrill
MANDRILL_API_KEY=your-api-key
MANDRILL_FROM_EMAIL=noreply@example.com
MANDRILL_TO_EMAIL=contact@example.com

# Cloudflare Turnstile (optional, for bot protection)
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your-site-key
CLOUDFLARE_TURNSTILE_SECRET_KEY=your-secret-key

# Analytics (optional)
NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=GTM-XXXXXX
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX
NEXT_PUBLIC_FACEBOOK_APP_ID=your-fb-app-id
```

---

## Cache Components (Next.js 16)

This project uses Next.js 16 Cache Components (`cacheComponents: true`). See the [root README](../../README.md#cache-components-gotchas) for comprehensive gotchas and best practices.

**Integration-Specific Notes:**
- **User-Specific Data**: Never cache personalized data (user carts, accounts, private content)
- **Real-Time Data**: Use `cache: 'no-store'` for live feeds, stock prices, chat messages
- **Cache Invalidation**: Use `revalidateTag()` or `revalidatePath()` in webhook handlers

---

## Managing Integrations

This template includes several optional integrations. You can choose which to keep during setup, conditionally load them, or remove unused ones to reduce bundle size.

### Interactive Setup

The easiest way to manage integrations is during project setup:

```bash
bun run setup:project
```

This interactively lets you choose which integrations to keep and automatically removes unused code and dependencies.

### Automatic Detection

The template automatically detects which integrations are configured via environment variables. Unconfigured integrations will be flagged during development startup.

For centralized feature detection in your code, use the feature configuration:

```typescript
import { features } from '~/config/features'

// Check if specific features are enabled
if (features.sanity) {
  // Load Sanity components
}

if (features.shopify) {
  // Load Shopify components
}
```

### Conditional Loading

Instead of removing integrations entirely, you can conditionally load them based on configuration:

```tsx
import { isShopifyConfigured } from '~/lib/integrations/check-integration'

export default function Page() {
  if (isShopifyConfigured()) {
    // Only import Shopify components when configured
    const { ShopifyCart } = await import('~/lib/integrations/shopify/cart')
    return <ShopifyCart />
  }
  
  return <div>Shopify not configured</div>
}
```

**Available check functions:**
- `isSanityConfigured()`
- `isShopifyConfigured()`
- `isHubSpotConfigured()`
- `isMailchimpConfigured()`
- `isMandrillConfigured()`
- `isAnalyticsConfigured()`
- `isTurnstileConfigured()`

### Removing Unused Integrations

If you're not using certain integrations, you can remove them to reduce bundle size and maintenance overhead.

#### 1. Sanity CMS

```bash
# Remove directories
rm -rf lib/integrations/sanity app/studio app/(examples)/sanity

# Remove from app/layout.tsx:
# - import { VisualEditing } from 'next-sanity/visual-editing'
# - import { DisableDraftMode } from '~/lib/integrations/sanity/components/disable-draft-mode'
# - import { SanityLive } from '~/lib/integrations/sanity/live'
# - The related JSX components

# Uninstall dependencies
bun remove @sanity/asset-utils @sanity/image-url @sanity/visual-editing next-sanity sanity-plugin-link-field sanity @sanity/vision @portabletext/react
```

#### 2. Shopify

```bash
# Remove directories
rm -rf lib/integrations/shopify app/(examples)/shopify

# No specific packages to uninstall (uses GraphQL)
```

#### 3. HubSpot

```bash
# Remove directories
rm -rf lib/integrations/hubspot app/(examples)/hubspot

# Uninstall dependencies
bun remove @hubspot/api-client
```

#### 4. Mailchimp

```bash
# Remove directory
rm -rf lib/integrations/mailchimp
```

#### 5. Mandrill

```bash
# Remove directory
rm -rf lib/integrations/mandrill
```

#### 6. Google Analytics

```bash
# Remove from app/layout.tsx:
# - import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
# - The GTM_ID and GA_ID variables
# - The related JSX components

# Uninstall dependencies
bun remove @next/third-parties
```

#### 7. Cloudflare Turnstile

```bash
# Remove Turnstile validation
rm lib/integrations/mailchimp/turnstile.ts

# Update any forms that use Turnstile validation
```

#### After Removal

1. **Clean up imports**: Run `bun lint:fix` to catch any broken imports
2. **Update dependencies**: Run `bun install` to clean up lock file
3. **Test build**: Run `bun build` to ensure everything still works
4. **Update documentation**: Remove references to deleted integrations

### Bundle Size Impact

Typical bundle size reductions when removing integrations:

| Integration | Savings |
|-------------|---------|
| Sanity | ~150-200KB (includes Studio, visual editing) |
| Shopify | ~50-80KB (GraphQL client, cart logic) |
| HubSpot | ~30-50KB (API client) |
| Mailchimp | ~10-20KB |
| Mandrill | ~10-20KB |

**Total potential savings**: 250-360KB+ depending on which integrations you remove.

### Programmatic Usage

You can use these utilities in your own scripts:

```typescript
import { 
  getConfiguredIntegrations,
  getUnconfiguredIntegrations 
} from '~/integrations/check-integration'

// Get configured/unconfigured integrations
const configured = getConfiguredIntegrations()
const unconfigured = getUnconfiguredIntegrations()

console.log('Configured:', configured)
console.log('Not configured:', unconfigured)
```

### Questions?

If you're unsure whether you need an integration:
- Check your `.env.local` file
- Review your project requirements
- Run `bun run setup:project` and review the integration options
