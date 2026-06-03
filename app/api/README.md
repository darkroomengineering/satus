# API Routes

Server-side API endpoints for integrations and webhooks.

## Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/draft-mode/enable` | GET | Enable Sanity draft mode |
| `/api/draft-mode/disable` | GET | Disable Sanity draft mode |
| `/api/revalidate` | POST | Webhook for content revalidation |

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

Receives Sanity webhooks to revalidate cached content.

```
POST /api/revalidate
```

### Sanity Webhook Setup

1. Go to Sanity project settings → API → Webhooks
2. Create webhook with URL: `https://your-domain.com/api/revalidate`
3. Set secret in environment:

```bash
# .env.local
SANITY_REVALIDATE_SECRET=your-secret-here
```

The route uses `parseBody` from `next-sanity/webhook` to verify the Sanity signature. It is Sanity-only; Shopify cache invalidation is handled separately via `revalidateTag`.

## Security

- Webhooks require a secret token for authentication (`SANITY_REVALIDATE_SECRET`)
- Rate limiting is applied to prevent abuse (429 on excess requests)
- Invalid signature returns 401; malformed body returns 400

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
