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
import { mailchimpSubscriptionAction } from '@/integrations/mailchimp'

;<Form action={mailchimpSubscriptionAction}>
  <Input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

`mailchimpContactAction` (also exported from `@/integrations/mailchimp`) handles a contact form instead of a newsletter signup. Its schema requires `name`, `email`, `subject`, and `message`; on submit it posts the message as a note on a new Mailchimp contact. It returns the same `FormState` shape as `mailchimpSubscriptionAction`.

```tsx
import { Form, Input, SubmitButton } from '@/components/ui/form'
import { mailchimpContactAction } from '@/integrations/mailchimp'

;<Form action={mailchimpContactAction}>
  <Input name="name" required />
  <Input name="email" type="email" required />
  <Input name="subject" required />
  <Input name="message" required />
  <SubmitButton>Send</SubmitButton>
</Form>
```

## Features

- Double opt-in (GDPR compliant) — new members are added with `status: 'pending'` by default, which sends Mailchimp's confirmation email. Pass `status: 'subscribed'` to `addContactToMailchimp` / `addSubscriberToMailchimp` to skip it for projects with their own lawful basis for single opt-in.
- Invisible Turnstile spam protection (via `lib/integrations/turnstile`)
- Tag-based segmentation

## Getting Credentials

1. **API Key**: Account → Extras → API Keys
2. **Server Prefix**: Found in API key (e.g., `us17`)
3. **Audience ID**: Audience → Settings → Audience name

### Validation

Both actions validate email format (and the contact action's other fields) using Zod. Env vars are validated via `mailchimpEnvSchema` in the integration registry. Validation failures return `{ fieldErrors: Record<string, string> }`; API and network failures return only `{ status, message }`, with no `fieldErrors`.

## Notes

- Turnstile requires HTTPS (auto-disabled in development when secret key is absent)
- The action validates the `cf-turnstile-response` form field — render Cloudflare's Turnstile widget inside the form (see `lib/integrations/turnstile/README.md`)
- New subscribers appear as "Pending" until email confirmed
