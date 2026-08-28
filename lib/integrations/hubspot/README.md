# HubSpot Integration

Form handling and marketing automation, with Cloudflare Turnstile spam protection.

## Environment Variables

```env
HUBSPOT_ACCESS_TOKEN=your-token
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-portal-id

# Required for the Forms API (getForm) — the HubSpot form ID to fetch and render server-side
NEXT_HUBSPOT_FORM_ID=your-form-id

# Optional — comma-separated allowlist of form IDs the newsletter server
# action may submit to. Pins which HubSpot forms this app can post to,
# instead of trusting whatever formId a client sends. Unset means no
# restriction (any formId passing schema validation is accepted).
HUBSPOT_ALLOWED_FORM_IDS=form-id-one,form-id-two
```

## Usage

### Embedded Form

```tsx
import { EmbedHubspotForm } from '@/integrations/hubspot/embed'

;<EmbedHubspotForm
  formId="your-form-id"
  onSubmit={() => console.log('Submitted!')}
/>
```

### Server-rendered forms (Forms API)

`getForm` (`@/integrations/hubspot/fetch-form`) fetches a form's field definitions from the HubSpot Forms v3 API, so the form can be rendered server-side instead of embedded via HubSpot's client script. It reads `NEXT_HUBSPOT_FORM_ID` and requires `HUBSPOT_ACCESS_TOKEN`. This is the `formsApi` capability in the registry — check it with `hasCapability('hubspot', 'formsApi')` before rendering.

```tsx
import { Form } from '@/components/ui/form'
import { HubspotNewsletterAction } from '@/integrations/hubspot/action'
import { getForm } from '@/integrations/hubspot/fetch-form'

export default async function NewsletterPage() {
  const result = await getForm(process.env.NEXT_HUBSPOT_FORM_ID)
  if ('error' in result) return <p>Form not configured.</p>
  return (
    <Form action={HubspotNewsletterAction} formId={result.form.id}>
      <input type="email" name="email" placeholder="Your email" required />
      <button type="submit">Subscribe</button>
    </Form>
  )
}
```

The server action validates with Zod and posts to the HubSpot Forms v3 API. Rate limiting and Turnstile verification run first, in that order, via `runFormAction` — render a Turnstile widget in the form (see `lib/integrations/turnstile/README.md`) so its token lands in the `cf-turnstile-response` field.

### Server Action

```tsx
import { Form, Input, SubmitButton } from '@/components/ui/form'
import { HubspotNewsletterAction } from '@/integrations/hubspot/action'

;<Form action={HubspotNewsletterAction} formId="your-form-id">
  <Input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

### Validation

The newsletter action validates input in this order:

- Rate limiting by IP, applied first
- Turnstile token, validated second (via `lib/integrations/turnstile`) — the action rejects submissions without a valid `cf-turnstile-response` form field; render Cloudflare's Turnstile widget inside the form (see `lib/integrations/turnstile/README.md`)
- Zod validation last: email validated with `z.email()` (Zod 4 top-level validator), form ID validated as a non-empty string
- If `HUBSPOT_ALLOWED_FORM_IDS` is set, `formId` must be in the list or the action rejects with `{ status: 400, fieldErrors: { formId: 'Form is not allowed' } }`
- Returns `{ status: 400, fieldErrors }` on validation failure

Env vars are validated via `hubspotEnvSchema` in the integration registry. Turnstile env vars are configured separately and auto-skip in development when the secret key is absent.

## Getting Credentials

1. **Access Token**: Account → Settings → Integrations → Private Apps
2. **Portal ID**: Account → Settings → Account Setup → Account Defaults

## Troubleshooting

- **Form not loading**: Check `NEXT_PUBLIC_HUBSPOT_PORTAL_ID`
- **Submissions missing**: Verify form ID in HubSpot dashboard
