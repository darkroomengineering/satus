# HubSpot Integration

Form handling and marketing automation, with Cloudflare Turnstile spam protection.

## Environment Variables

```env
HUBSPOT_ACCESS_TOKEN=your-token              # Account → Settings → Integrations → Private Apps
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-portal-id # Account → Settings → Account Setup → Account Defaults

# Required in production — comma-separated allowlist of form IDs the
# newsletter server action may submit to. Pins which HubSpot forms this app
# can post to, instead of trusting whatever formId a client sends: unset in
# production, the action rejects every submission with a configuration
# error, because the public portal ID would otherwise let any caller relay
# arbitrary formIds through this server. In development, unset allows any
# formId (with a console warning) so local testing doesn't need the list.
HUBSPOT_ALLOWED_FORM_IDS=form-id-one,form-id-two
```

Env vars are validated by `hubspotEnvSchema` in the registry. Turnstile env vars are configured separately and auto-skip in development when the secret key is absent.

## Usage

```tsx
import { Form, Input, SubmitButton } from '@/components/ui/form'
import { HubspotNewsletterAction } from '@/integrations/hubspot/action'
import { EmbedHubspotForm } from '@/integrations/hubspot/embed'

// Embedded HubSpot form
;<EmbedHubspotForm formId="your-form-id" onSubmit={() => {}} />

// Server action, posts to the HubSpot Forms v3 API
;<Form action={HubspotNewsletterAction} formId="your-form-id">
  <Input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

## Server action validation

Checks run in this order (1 to 3 in `runFormAction`, 4 in the action's handler):

1. Rate limiting by IP
2. Turnstile token (via `lib/integrations/turnstile`): submissions without a valid `cf-turnstile-response` field are rejected, so render Cloudflare's Turnstile widget inside the form (see `lib/integrations/turnstile/README.md`)
3. Zod: email with `z.email()`, form ID as a non-empty string; failure returns `{ status: 400, fieldErrors }`
4. Allowlist: with `HUBSPOT_ALLOWED_FORM_IDS` set, a `formId` not in the list returns `{ status: 400, fieldErrors: { formId: 'Form is not allowed' } }`; unset in production, every submission returns `{ status: 500, message: 'security_configuration_error_' }`; unset in development, any formId passes with a logged warning

## Troubleshooting

- **Form not loading**: check `NEXT_PUBLIC_HUBSPOT_PORTAL_ID`
- **Submissions missing**: verify the form ID in the HubSpot dashboard
