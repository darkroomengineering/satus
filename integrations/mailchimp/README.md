# Mailchimp Integration

This integration provides contact form submission and newsletter subscription functionality using Mailchimp's Marketing API with **invisible Cloudflare Turnstile** spam protection.

> **💡 Note**: For contact forms, we recommend using the **[Combined Contact Solution](../mandrill/README.md)** that uses both Mailchimp (audience building) and Mandrill (email notifications) for optimal results.

## Features

- **Contact Form Integration**: Automatically adds contact form submissions to your Mailchimp audience with relevant tags and notes
- **Newsletter Subscriptions**: Simple newsletter signup functionality
- **Audience Management**: Tag-based segmentation (contact-form, newsletter)
- **Terminal-style Messages**: Error handling that matches your cyberpunk aesthetic
- **Invisible Spam Protection**: Cloudflare Turnstile - better than reCAPTCHA, completely invisible (production only)
- **Double Opt-In**: Email confirmation for higher quality subscribers and GDPR compliance
- **Duplicate Handling**: Gracefully handles existing subscribers

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Mailchimp API Configuration
MAILCHIMP_API_KEY=your_api_key_here
MAILCHIMP_SERVER_PREFIX=us17
MAILCHIMP_AUDIENCE_ID=your_audience_id_here

# Cloudflare Turnstile (Invisible CAPTCHA - Production Only)
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_site_key_here
CLOUDFLARE_TURNSTILE_SECRET_KEY=your_secret_key_here
```

### How to Get Mailchimp Credentials

1. **API Key**: Account → Extras → API Keys → Create A Key
2. **Server Prefix**: Found in your API key (e.g., `us17` from `key-us17`)
3. **Audience ID**: Audience → Settings → Audience name and defaults

### How to Get Cloudflare Turnstile Keys

1. **Go to**: [Cloudflare Dashboard](https://dash.cloudflare.com) → Turnstile
2. **Add Site**: Enter your domain (use your production domain)
3. **Copy Keys**: Site Key (public) and Secret Key (private)

## Usage

### Contact Form
```tsx
import { Form, Input, Textarea, SubmitButton } from '~/components/form'
import { Turnstile } from '~/components/turnstile'
import { mailchimpContactAction } from '~/integrations/mailchimp'

function ContactForm() {
  return (
    <Form action={mailchimpContactAction}>
      <Input name="name" label="Name" required />
      <Input name="email" type="email" label="Email" required />
      <Input name="subject" label="Subject" required />
      <Textarea name="message" label="Message" required />
      <Turnstile />
      <SubmitButton>Send Message</SubmitButton>
    </Form>
  )
}
```

### Newsletter Subscription
```tsx
import { Form, Input, SubmitButton } from '~/components/form'
import { Turnstile } from '~/components/turnstile'
import { mailchimpSubscriptionAction } from '~/integrations/mailchimp'

function NewsletterForm() {
  return (
    <Form action={mailchimpSubscriptionAction}>
      <Input name="email" type="email" placeholder="enter your email_" required />
      <Turnstile />
      <SubmitButton>subscribe_</SubmitButton>
    </Form>
  )
}
```

## Understanding Double Opt-In

### What Happens When Someone Subscribes:

1. **Form submitted** → Server validates and sends to Mailchimp
2. **Mailchimp adds contact** with status `pending`
3. **Mailchimp sends confirmation email** to the subscriber
4. **Subscriber clicks link** → Status changes to `subscribed`

### Where to Find Your Subscribers:

#### **Pending Subscribers** (Awaiting Confirmation):
- **Mailchimp Dashboard** → **Audience** → **All contacts**  
- **Filter by**: "Pending" or "Unconfirmed" status
- **Look for**: Recent submissions waiting for email confirmation

#### **Confirmed Subscribers**:
- **Mailchimp Dashboard** → **Audience** → **All contacts**
- **Filter by**: "Subscribed" status  
- **These are**: Fully confirmed and active subscribers

### Why Double Opt-In?
- ✅ **GDPR Compliant**: Explicit consent required
- ✅ **Better Deliverability**: Confirmed email addresses
- ✅ **Higher Quality**: Engaged, genuine subscribers
- ✅ **Spam Prevention**: Reduces fake email submissions

## Spam Protection: Cloudflare Turnstile

**Production Only**: Turnstile requires HTTPS in production. In development it is skipped gracefully.

**Why Turnstile over reCAPTCHA?**
- ✅ **Completely invisible** - no user interaction required
- ✅ **Faster** - better performance than Google reCAPTCHA  
- ✅ **More privacy-friendly** - doesn't track users
- ✅ **Better UX** - perfect for terminal/cyberpunk aesthetics
- ✅ **Free** - generous free tier

### Protection Levels

1. **Development**: Automatically disabled (no console errors)
2. **Production**: Invisible validation on every form submission
3. **Fallback**: Graceful degradation if Turnstile fails

## Data Structure

### Contact Form Submissions
- **Email**: Added to Mailchimp audience
- **Tags**: `contact-form` 
- **Notes**: Full message content stored in subscriber notes
- **Status**: `pending` (requires email confirmation)

### Newsletter Subscriptions  
- **Email**: Added to Mailchimp audience
- **Tags**: `newsletter`
- **Status**: `pending` (requires email confirmation)

## Error Handling

All errors use terminal-style messages that match your UI:

- `email_required_` - Email field is empty
- `invalid_email_format_` - Email format is invalid
- `name_required_` - Name field is empty (contact form)
- `subject_required_` - Subject field is empty (contact form)
- `message_required_` - Message field is empty (contact form)
- `access_denied_` - Spam detection triggered (production only)
- `subscription_failed_` - Mailchimp API error
- `already_subscribed_` - Email already in audience
- `connection_error_` - Network/API connectivity issue

## Success Messages

- `message_sent_` - Contact form submitted successfully
- `subscription_successful_` - Newsletter subscription successful (confirmation email sent)

## Development Notes

- **Environment Check**: Integration gracefully handles missing environment variables
- **Development Mode**: Turnstile is disabled on localhost (no errors)
- **Double Opt-in**: All submissions require email confirmation (prevents fake emails)
- **Tag-based Segmentation**: Easy to create targeted campaigns in Mailchimp
- **Production Ready**: Invisible spam protection with HTTPS domains

## Troubleshooting

### "I don't see new subscribers in my audience"
- **Check**: Audience → All contacts → Filter by "Pending" status
- **Remember**: Double opt-in requires email confirmation first

### "Forms submit but no emails reach Mailchimp"
- **Check**: Browser console and server logs for errors
- **Verify**: Environment variables are correctly configured
- **Test**: With a real email address you can access

### "Turnstile errors in development"
- **Expected**: Turnstile only works with HTTPS in production
- **Development**: Gracefully disabled on localhost

## Rate Limits

Mailchimp has rate limits on their API:
- Standard plans: 10 simultaneous connections
- Higher-tier plans: More connections allowed

The integration handles rate limiting gracefully with appropriate error messages. 