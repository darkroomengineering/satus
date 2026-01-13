# HubSpot Integration

Form handling and marketing automation.

## Environment Variables

```env
HUBSPOT_ACCESS_TOKEN=your-token
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-portal-id
```

## Usage

### Embedded Form

```tsx
import { EmbedHubspotForm } from '@/lib/integrations/hubspot/embed'

<EmbedHubspotForm 
  formId="your-form-id"
  onSubmit={() => console.log('Submitted!')}
/>
```

### Server Action

```tsx
import { Form, Input, SubmitButton } from '@/components/ui/form'
import { HubspotNewsletterAction } from '@/lib/integrations/hubspot/action'

<Form action={HubspotNewsletterAction} formId="your-form-id">
  <Input name="email" type="email" required />
  <SubmitButton>Subscribe</SubmitButton>
</Form>
```

## Getting Credentials

1. **Access Token**: Account → Settings → Integrations → Private Apps
2. **Portal ID**: Account → Settings → Account Setup → Account Defaults

## Troubleshooting

- **Form not loading**: Check `NEXT_PUBLIC_HUBSPOT_PORTAL_ID`
- **Submissions missing**: Verify form ID in HubSpot dashboard
