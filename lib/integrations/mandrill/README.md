# Mandrill Integration

Contact form with email relay + Mailchimp audience building.

## Environment Variables

```env
MANDRILL_API_KEY=your-api-key
NEXT_PUBLIC_CONTACT_EMAIL=contact@your-domain.com

# Optional
MANDRILL_FROM_EMAIL=noreply@your-domain.com
MANDRILL_FROM_NAME="Your Company Contact Form"
```

## Usage

### Combined Contact Form (Recommended)

Sends email via Mandrill AND adds contact to Mailchimp:

```tsx
import { Form, Input, Textarea, SubmitButton } from '@/components/ui/form'
import { Turnstile } from '@/components/turnstile'
import { combinedContactAction } from '@/lib/integrations/mandrill'

<Form action={combinedContactAction}>
  <Input name="name" required />
  <Input name="email" type="email" required />
  <Input name="subject" required />
  <Textarea name="message" required />
  <Turnstile />
  <SubmitButton>Send</SubmitButton>
</Form>
```

### Email-Only

```tsx
import { mandrillContactAction } from '@/lib/integrations/mandrill'

<Form action={mandrillContactAction}>...</Form>
```

## How It Works

1. **Mandrill**: Sends formatted email to your inbox
2. **Mailchimp**: Adds contact to audience with "contact-form" tag

Both run in parallel with fault tolerance:
- Email sent + contact saved → "sent_"
- Email sent, contact failed → "sent_" (user doesn't need to know)
- Email failed, contact saved → "message received_"
- Both failed → "please try again"

## Getting API Key

Mailchimp Account → Extras → Transactional email → Settings → SMTP & API info
