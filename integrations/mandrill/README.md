# Mandrill Email Relay Integration

This integration provides email relay functionality for contact form submissions using Mandrill (Mailchimp's transactional email service). **It works in combination with Mailchimp** to provide both immediate email notifications and audience building.

## Combined Contact Form Solution

Our contact form uses **BOTH services simultaneously**:

- **🟢 Mandrill**: Sends formatted email to your business inbox for immediate notification
- **🟢 Mailchimp**: Adds contact to audience for future marketing and CRM

This dual approach ensures you get immediate notifications while building your marketing database.

## Setup

### 1. Get Mandrill API Key

1. Log into your Mailchimp account
2. Go to **Account & billing** > **Extras** > **Transactional email**
3. Enable Mandrill if not already enabled
4. Go to **Settings** > **SMTP & API info**
5. Generate a new API key

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# ===== MANDRILL (Email Relay) =====
# Required - Mandrill API key
MANDRILL_API_KEY=your_mandrill_api_key_here

# Required - Contact email (where form submissions will be sent)
NEXT_PUBLIC_CONTACT_EMAIL=contact@your-domain.com

# Optional - Custom from email (defaults to NEXT_PUBLIC_CONTACT_EMAIL)
MANDRILL_FROM_EMAIL=noreply@your-domain.com

# Optional - Custom from name (defaults to "AE Labs Contact Form")
MANDRILL_FROM_NAME="Your Company Contact Form"

# Optional - Custom to email (defaults to NEXT_PUBLIC_CONTACT_EMAIL)
MANDRILL_TO_EMAIL=admin@your-domain.com

# ===== MAILCHIMP (Audience Building) =====
MAILCHIMP_API_KEY=your_mailchimp_api_key_here
MAILCHIMP_SERVER_PREFIX=us17
MAILCHIMP_AUDIENCE_ID=your_audience_id_here

# ===== TURNSTILE (Spam Protection) =====
# Required for production - Cloudflare Turnstile keys
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key_here
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key_here
```

## How It Works

When someone submits your contact form, the `combinedContactAction` executes **both operations in parallel**:

### **Mandrill (Email Relay)**
1. **Formats contact data** into professional email template
2. **Sends email** to your business inbox immediately  
3. **Sets Reply-To header** to user's email for easy responses
4. **Provides instant notification** of new contacts

### **Mailchimp (Audience Building)**
1. **Adds contact to your audience** with "contact-form" tag
2. **Stores full contact details** for future marketing
3. **Saves message content** as notes in Mailchimp
4. **Builds your marketing database** automatically

### **Intelligent Fault Tolerance**
Our system provides smart error handling that ensures users get appropriate feedback:

- ✅ **Perfect success**: Both email sent AND contact saved → "sent_"
- ✅ **Email priority**: Email sent, contact save failed → "sent_" (user doesn't need to know about audience failure)
- ✅ **Contact saved**: Email failed, but contact saved → "message received_" (honest feedback - their contact was received)
- ❌ **Total failure**: Both services failed → "please try again" (true error state)

This means **users never see false failures** - if their contact was saved in any way, they get positive feedback.

## Features

- ✅ **Terminal-styled email template** matching your brand
- ✅ **Plain text fallback** for accessibility
- ✅ **Reply-To header** for easy responses
- ✅ **Spam protection** via Turnstile integration
- ✅ **Email validation** and sanitization
- ✅ **Professional delivery** with tracking
- ✅ **No database required** - email is your storage

## Email Template

The email includes:
- Contact's name and email (with mailto link)
- Subject line
- Message content
- Professional styling
- Clear reply instructions

## Development

For local development, the integration will work with any valid Mandrill API key. Make sure to:

1. Use a development Mandrill account or test keys
2. Set `NEXT_PUBLIC_CONTACT_EMAIL` to your test email
3. Test form submissions to ensure emails are delivered

## Production Considerations

- **Domain authentication**: Set up SPF, DKIM, and DMARC records
- **Sending reputation**: Use a dedicated IP if sending high volume
- **Monitoring**: Set up Mandrill webhooks for delivery tracking
- **Rate limiting**: Implement if needed for security

## Error Handling

The integration provides **intelligent error handling** with user-friendly messages:

### **User Messages**
- `"sent_"` - Email delivered successfully (with or without Mailchimp)
- `"message received_"` - Contact saved but email delivery failed  
- `"please try again"` - Both email and contact save failed
- `"already subscribed_"` - Email already in newsletter audience

### **Technical Error Handling**
The system gracefully handles:
- Invalid API keys (both Mandrill and Mailchimp)
- Network connectivity issues
- Service outages (either Mandrill or Mailchimp)
- Malformed data and validation errors
- Spam protection failures (Turnstile)

### **Logging & Monitoring**
- All service failures are logged with `console.warn()` for monitoring
- Critical errors are logged with `console.error()`
- Operations run in parallel with `Promise.allSettled()` for reliability

## Alternative Configurations

### Multiple Recipients

To send to multiple email addresses:

```typescript
// In action.ts, modify the 'to' array:
to: [
  { email: 'admin@your-domain.com', name: 'Admin', type: 'to' },
  { email: 'sales@your-domain.com', name: 'Sales', type: 'cc' }
]
```

### Custom Email Templates

Modify `createEmailTemplate()` function in `action.ts` to customize the email design.

### Integration with CRM

Add webhook endpoints to automatically sync contact submissions with your CRM system.

## Usage Examples

### **Combined Contact Form (Recommended)**

Uses both Mailchimp and Mandrill simultaneously:

```tsx
import { combinedContactAction } from '~/integrations/mandrill'
import { Form, Input, Textarea, SubmitButton } from '~/components/form'
import { Turnstile } from '~/components/turnstile'

function ContactForm() {
  return (
    <Form action={combinedContactAction}>
      <Input name="name" placeholder="name_" required />
      <Input name="email" placeholder="e-mail_" required />
      <Input name="subject" placeholder="subject_" required />
      <Textarea name="message" placeholder="message_" required />
      <Turnstile />
      <SubmitButton>send_</SubmitButton>
    </Form>
  )
}
```

### **Email-Only Contact Form**

Uses only Mandrill for email relay:

```tsx
import { mandrillContactAction } from '~/integrations/mandrill'

function SimpleContactForm() {
  return (
    <Form action={mandrillContactAction}>
      {/* Same form fields */}
    </Form>
  )
}
```

### **Audience-Only Form**

Uses only Mailchimp for audience building:

```tsx
import { mailchimpContactAction } from '~/integrations/mailchimp'

function MailchimpOnlyForm() {
  return (
    <Form action={mailchimpContactAction}>
      {/* Same form fields */}
    </Form>
  )
}
```

## Related Documentation

- **[Mailchimp Integration](../mailchimp/README.md)** - Audience building and newsletter features
- **[Turnstile Integration](../mailchimp/turnstile.ts)** - Spam protection setup 