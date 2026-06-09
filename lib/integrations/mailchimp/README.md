# Mailchimp Integration

Email subscriptions with Cloudflare Turnstile spam protection.

## Environment Variables

```env
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_AUDIENCE_ID=your-audience-id
```

Turnstile env vars are configured separately — see `lib/integrations/turnstile/README.md`.

## Usage

```tsx
import { Form, Input, SubmitButton } from '@/components/ui/form'
import { mailchimpSubscriptionAction } from '@/lib/integrations/mailchimp'

<Form action={mailchimpSubscriptionAction}>
  <Input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

## Features

- Double opt-in (GDPR compliant)
- Invisible Turnstile spam protection (via `lib/integrations/turnstile`)
- Tag-based segmentation

## Getting Credentials

1. **API Key**: Account → Extras → API Keys
2. **Server Prefix**: Found in API key (e.g., `us17`)
3. **Audience ID**: Audience → Settings → Audience name

### Validation

Contact and subscription actions validate email format using Zod's `emailSchema`. Env vars are validated via `mailchimpEnvSchema` in the integration registry. Error responses use the unified `fieldErrors: Record<string, string>` pattern.

## Notes

- Turnstile requires HTTPS (auto-disabled in development when secret key is absent)
- The action validates the `cf-turnstile-response` form field — render Cloudflare's Turnstile widget inside the form (see `lib/integrations/turnstile/README.md`)
- New subscribers appear as "Pending" until email confirmed
