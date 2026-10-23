# Mailchimp Integration

Email subscriptions and contact forms, with Cloudflare Turnstile spam protection.

## Environment Variables

```env
MAILCHIMP_API_KEY=your-api-key            # Account → Extras → API Keys
MAILCHIMP_SERVER_PREFIX=us1               # the suffix of the API key (e.g. us17)
MAILCHIMP_AUDIENCE_ID=your-audience-id    # Audience → Settings → Audience name
```

Turnstile env vars are configured separately (`lib/integrations/turnstile/README.md`).

## Usage

```tsx
import { Form, Input, SubmitButton } from '@/components/ui/form'
import { mailchimpSubscriptionAction } from '@/integrations/mailchimp'

;<Form action={mailchimpSubscriptionAction}>
  <Input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

`mailchimpContactAction` (same module) handles a contact form instead: its schema requires `name`, `email`, `subject`, and `message`; it adds or updates the Mailchimp contact and posts the message as a note. Success requires storing the note; HTTP and network failures return an error even if the contact was saved. It returns the same `FormState` shape as `mailchimpSubscriptionAction`.

## Behavior

- Double opt-in (GDPR compliant): new members are added with `status: 'pending'` by default, which sends Mailchimp's confirmation email, so new subscribers appear as "Pending" until they confirm. Pass `status: 'subscribed'` to `addContactToMailchimp` / `addSubscriberToMailchimp` to skip it for projects with their own lawful basis for single opt-in.
- Tagging is optional: failures are logged without rejecting a saved contact or subscription.
- Email-only subscriptions preserve existing first and last names; supplied name fields update only those fields, and explicit empty strings clear them.
- Both actions validate the `cf-turnstile-response` form field, so render Cloudflare's Turnstile widget inside the form (`lib/integrations/turnstile/README.md`). Turnstile requires HTTPS (auto-disabled in development when its secret key is absent).
- Both actions validate input with Zod; env vars are validated by `mailchimpEnvSchema` in the registry. Validation failures return `{ fieldErrors: Record<string, string> }`; API and network failures return only `{ status, message }`, with no `fieldErrors`.
