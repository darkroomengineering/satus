# Turnstile Integration

Cloudflare Turnstile bot-protection for form submissions.

## Environment Variables

```env
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your-site-key
CLOUDFLARE_TURNSTILE_SECRET_KEY=your-secret-key
```

## Usage

```tsx
import { validateFormWithTurnstile } from '@/lib/integrations/turnstile'

const validation = await validateFormWithTurnstile(formData)
if (!validation.isValid) {
  return { status: 400, message: 'invalid_input_', fieldErrors: { turnstile: validation.errors[0] } }
}
```

## Features

- Invisible to users — no CAPTCHA puzzle to solve
- Privacy-friendly (no tracking cookies)
- Fails closed in production when secret key is missing
- Fails open in development for easier local testing

## Getting Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Turnstile
2. Add a site to get your site key and secret key
3. Set `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` (client-visible) and `CLOUDFLARE_TURNSTILE_SECRET_KEY` (server-only)

## Notes

- Turnstile requires HTTPS (auto-disabled in development when secret key is absent)
- The server reads the `cf-turnstile-response` field that Cloudflare's client-side widget appends to the form. The starter ships no widget component — render it with [Cloudflare's script](https://developers.cloudflare.com/turnstile/get-started/) and a `data-sitekey` set to `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`
- This module is shared across integrations (Mailchimp, etc.) — do not embed it inside a specific integration bundle
