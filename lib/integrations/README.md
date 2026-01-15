# Integrations

Third-party service integrations. All are optional—remove unused ones with `bun run setup:project`.

## Available Integrations

| Integration | Purpose | Documentation |
|-------------|---------|---------------|
| [Sanity](sanity/README.md) | Headless CMS | Visual editing, content management |
| [Shopify](shopify/README.md) | E-commerce | Cart, products, checkout |
| [HubSpot](hubspot/README.md) | Forms | Marketing forms, CRM |
| [Mailchimp](mailchimp/README.md) | Newsletter | Email subscriptions |
| [Mandrill](mandrill/README.md) | Email | Transactional emails |

## Environment Variables

```env
# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
SANITY_API_WRITE_TOKEN="your-write-token"

# Shopify
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="your-token"
SHOPIFY_REVALIDATION_SECRET="your-secret"

# HubSpot
HUBSPOT_ACCESS_TOKEN=your-token
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-portal-id

# Mailchimp
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_AUDIENCE_ID=your-audience-id

# Mandrill
MANDRILL_API_KEY=your-api-key
NEXT_PUBLIC_CONTACT_EMAIL=contact@example.com

# Cloudflare Turnstile (spam protection)
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your-site-key
CLOUDFLARE_TURNSTILE_SECRET_KEY=your-secret-key

# Analytics
NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=GTM-XXXXXX
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX
```

## Quick Usage

```tsx
// Sanity
import { sanityFetch } from '@/integrations/sanity/live'
import { RichText } from '@/integrations/sanity/components/rich-text'
const { data } = await sanityFetch({ query: pageQuery })

// Shopify
import { Cart, AddToCart } from '@/lib/integrations/shopify/cart'
<Cart><AddToCart product={product} /></Cart>

// HubSpot
import { EmbedHubspotForm } from '@/lib/integrations/hubspot/embed'
<EmbedHubspotForm formId="your-form-id" />

// Mailchimp
import { mailchimpSubscriptionAction } from '@/lib/integrations/mailchimp'
<Form action={mailchimpSubscriptionAction}>...</Form>
```

## Removing Integrations

Run `bun run setup:project` for interactive removal, or manually:

```bash
# Sanity (~150-200KB savings)
rm -rf lib/integrations/sanity app/studio app/(examples)/sanity
bun remove @sanity/asset-utils @sanity/image-url next-sanity sanity

# Shopify (~50-80KB)
rm -rf lib/integrations/shopify app/(examples)/shopify

# HubSpot (~30-50KB)
rm -rf lib/integrations/hubspot app/(examples)/hubspot
bun remove @hubspot/api-client

# Mailchimp/Mandrill (~20KB each)
rm -rf lib/integrations/mailchimp lib/integrations/mandrill
```

After removal: `bun lint:fix && bun build`
