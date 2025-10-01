# HubSpot Integration

Form handling and marketing automation integration with HubSpot.

## Features

- Embedded HubSpot forms
- Newsletter subscriptions
- Contact form submissions
- Custom form styling
- Automatic form field mapping
- Marketing automation integration

## Environment Variables

```env
HUBSPOT_ACCESS_TOKEN=your-access-token
NEXT_PUBLIC_HUBSPOT_PORTAL_ID=your-portal-id
```

### Getting Credentials

1. **Access Token**: HubSpot Account → Settings → Integrations → Private Apps → Create
2. **Portal ID**: HubSpot Account → Settings → Account Setup → Account Defaults

## Usage

### Embedded HubSpot Form

Uses HubSpot's form builder and embeds the form with custom styling:

```tsx
import { EmbedHubspotForm } from '~/integrations/hubspot/embed'

function NewsletterSection() {
  return (
    <EmbedHubspotForm 
      formId="your-form-id"
      onSubmit={() => console.log('Form submitted!')}
    />
  )
}
```

### Server Action (Simple Forms)

For simple newsletter forms using HubSpot's Forms API:

```tsx
import { Form, Input, SubmitButton } from '~/components/form'
import { HubspotNewsletterAction } from '~/integrations/hubspot/action'

function NewsletterForm() {
  return (
    <Form action={HubspotNewsletterAction} formId="your-form-id">
      <Input name="email" type="email" placeholder="email_" required />
      <SubmitButton>subscribe_</SubmitButton>
    </Form>
  )
}
```

### Fetching Form Schema

For custom form rendering:

```tsx
import { getForm } from '~/integrations/hubspot/fetch-form'

export default async function CustomFormPage() {
  const { form, error } = await getForm('your-form-id')
  
  if (error) return <div>Error loading form</div>
  
  // Build custom form UI from form.inputs
  return <CustomForm schema={form} />
}
```

## Form Styling

Forms are styled using CSS modules in `embed/form.module.css`. The styling matches the terminal/cyberpunk aesthetic with:

- Custom input fields
- Styled select dropdowns
- Radio and checkbox styling
- Toggle switches
- Textarea customization
- Error state handling

All styles use responsive viewport units (`mobile-vw()`, `desktop-vw()`).

## API Reference

**`HubspotNewsletterAction(formData)`**
- Server action for newsletter subscriptions
- Submits email to HubSpot Forms API
- Returns status and message

**`EmbedHubspotForm`**
- Embeds HubSpot form via Forms API
- Props: `formId`, `target`, `className`, `onSubmit`, `strategy`
- Loads HubSpot script and creates form

**`getForm(formId, handler)`**
- Fetches form schema from HubSpot API
- Returns form fields, validation, and configuration
- Used for custom form rendering

## Best Practices

- Use embedded forms for complex multi-step forms
- Use server actions for simple email collection
- Always provide `formId` from HubSpot
- Test form submissions in HubSpot dashboard
- Check spam filters for confirmation emails

## Troubleshooting

**Form not loading**
- Verify `NEXT_PUBLIC_HUBSPOT_PORTAL_ID` is set
- Check browser console for script errors
- Ensure form ID is correct in HubSpot

**Submissions not appearing**
- Check HubSpot form submissions in dashboard
- Verify form ID matches HubSpot configuration
- Check spam folder for confirmation emails

**Styling issues**
- Forms use global CSS with `:global()` selectors
- Custom styles in `embed/form.module.css`
- Check for CSS conflicts with Tailwind

## Related Documentation

- [HubSpot Forms API](https://developers.hubspot.com/docs/api/marketing/forms)
- [Components Guide](../../components/README.md)
- [Form Components](../../components/form/index.tsx)

