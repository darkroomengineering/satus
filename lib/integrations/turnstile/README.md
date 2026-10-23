# Turnstile Integration

Cloudflare Turnstile bot protection for form submissions.

## Environment Variables

```env
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your-site-key   # client-visible
CLOUDFLARE_TURNSTILE_SECRET_KEY=your-secret-key           # server-only
```

Both come from [Cloudflare Dashboard](https://dash.cloudflare.com) → Turnstile → add a site.

## Usage

```tsx
import { validateFormWithTurnstile } from '@/lib/integrations/turnstile'

const validation = await validateFormWithTurnstile(formData)
if (!validation.isValid) {
  return {
    status: 400,
    message: 'invalid_input_',
    fieldErrors: { turnstile: validation.errors[0] },
  }
}
```

## Behavior

- Invisible to users (no puzzle) and sets no tracking cookies
- Fails closed in production when the secret key is missing; fails open in development so local testing works
- Requires HTTPS (auto-disabled in development when the secret key is absent)
- The server reads the `cf-turnstile-response` field that Cloudflare's client-side widget appends to the form. The starter ships no widget component — render it with [Cloudflare's script](https://developers.cloudflare.com/turnstile/get-started/) and a `data-sitekey` set to `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`
- Shared across integrations (HubSpot, Mailchimp, Shopify customer actions): do not embed it inside a specific integration bundle
