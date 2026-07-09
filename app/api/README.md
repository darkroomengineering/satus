# API Routes

Server-side API endpoints for integrations and webhooks.

## Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/draft-mode/enable` | GET | Enable Sanity draft mode |
| `/api/draft-mode/disable` | GET | Disable Sanity draft mode |
| `/api/revalidate` | POST | Webhook for content revalidation (Sanity + Shopify) |

## Draft Mode

Used by Sanity Visual Editing to preview unpublished content.

### Enable Draft Mode

```
GET /api/draft-mode/enable?slug=/page-slug
```

Redirects to the page with draft mode cookies set.

### Disable Draft Mode

```
GET /api/draft-mode/disable
```

Clears draft mode cookies and redirects to homepage.

## Revalidation Webhook

A single endpoint receives both Sanity and Shopify webhooks and dispatches to the matching
provider's revalidation logic.

```
POST /api/revalidate
```

The route detects the request's origin and dispatches accordingly:

- **Shopify** — a request with an `x-shopify-topic` header (or a `secret` query param) is
  delegated to `revalidate()` in `lib/integrations/shopify/revalidate.ts`.
- **Sanity** — everything else falls through to the Sanity path below.

### Sanity Webhook Setup

1. Go to Sanity project settings → API → Webhooks
2. Create webhook with URL: `https://your-domain.com/api/revalidate`
3. Set secret in environment:

```bash
# .env.local
SANITY_REVALIDATE_SECRET=your-secret-here
```

The route uses `parseBody` from `next-sanity/webhook` to verify the Sanity signature.

### Shopify Webhook Setup

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Create a webhook for each event (see `lib/integrations/shopify/README.md` for the full list)
   with URL: `https://your-domain.com/api/revalidate?secret=YOUR_SHOPIFY_REVALIDATION_SECRET`
3. Set secret in environment:

```bash
# .env.local
SHOPIFY_REVALIDATION_SECRET=your-secret-here
```

Shopify sends the webhook topic in the `x-shopify-topic` header and the secret as the `secret`
query param. The handler always responds with `200` so Shopify does not retry.

## Security

- Webhooks require a secret token for authentication (`SANITY_REVALIDATE_SECRET`,
  `SHOPIFY_REVALIDATION_SECRET`)
- Rate limiting is applied to prevent abuse (429 on excess requests)
- Invalid Sanity signature returns 401; malformed body returns 400
- Invalid Shopify secret returns 401

## Adding New Endpoints

Create a new route file:

```tsx
// app/api/my-endpoint/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Handle request
  return NextResponse.json({ success: true })
}
```
