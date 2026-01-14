# Mailchimp Integration

Email subscriptions with Cloudflare Turnstile spam protection.

> For contact forms, see [Mandrill](../mandrill/README.md) for combined email + audience solution.

## Environment Variables

```env
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_SERVER_PREFIX=us1
MAILCHIMP_AUDIENCE_ID=your-audience-id

# Spam protection (production only)
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your-site-key
CLOUDFLARE_TURNSTILE_SECRET_KEY=your-secret-key
```

## Usage

```tsx
import { Form, Input, SubmitButton } from '@/components/ui/form'
import { Turnstile } from '@/components/turnstile'
import { mailchimpSubscriptionAction } from '@/lib/integrations/mailchimp'

<Form action={mailchimpSubscriptionAction}>
  <Input name="email" type="email" required />
  <Turnstile />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

## Features

- Double opt-in (GDPR compliant)
- Invisible Turnstile spam protection
- Tag-based segmentation

## Getting Credentials

1. **API Key**: Account → Extras → API Keys
2. **Server Prefix**: Found in API key (e.g., `us17`)
3. **Audience ID**: Audience → Settings → Audience name

## Notes

- Turnstile requires HTTPS (auto-disabled in development)
- New subscribers appear as "Pending" until email confirmed
