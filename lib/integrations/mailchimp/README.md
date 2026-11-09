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

`mailchimpContactAction` (same module) handles a contact form instead: its schema requires `name`, `email`, `subject`, and `message`; it adds the contact to the audience if it is new and posts the message as a note. Success requires storing the note; HTTP and network failures return an error even if the contact was saved. It returns the same `FormState` shape as `mailchimpSubscriptionAction`.

## Behavior

- Double opt-in (GDPR compliant): new members are added with `status: 'pending'` by default, which sends Mailchimp's confirmation email, so new subscribers appear as "Pending" until they confirm. Pass `status: 'subscribed'` to `addContactToMailchimp` / `addSubscriberToMailchimp` to skip it for projects with their own lawful basis for single opt-in.
- Tagging is optional: failures are logged without rejecting a saved contact or subscription.
- A submission never changes an existing member's name or status. The names it carries are set only when it creates a new member, and any existing record for the address, archived included, is left as it is. New and existing addresses get the same success, so the reply does not differ between an address that is on the list and one that is not. An existing address takes one fewer Mailchimp request, so response timing can still differ. The note and tags still land on the existing member.
- What a submission does depends on the record Mailchimp holds for the address:

  | Record for the address                                 | What the form does                                                              | What the visitor gets                                                                                |
  | ------------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
  | None                                                   | Creates the member (`pending` by default)                                       | Success: `subscription_successful_` / `message_sent_`                                                |
  | Subscribed, pending, unsubscribed, cleaned or archived | Leaves the name and status alone; the tag and the contact note are still stored | The same success                                                                                     |
  | Permanently deleted                                    | Stores nothing: Mailchimp refuses to re-add the address through its API         | Status 409 with `email_permanently_deleted_` (the contact action repeats it in `fieldErrors.submit`) |

  An archived member is not re-subscribed by a form: doing that would mean writing to an existing record on an anonymous visitor's word. For a permanently deleted address, give `email_permanently_deleted_` copy that points to your Mailchimp-hosted signup form; `Messages` renders the key as written. The cost of the distinct reply: anyone who types an address learns that it was permanently deleted from this audience, the one case where the reply differs by address. The client reports this case as `errorCode: 'forgotten_email'`, matched on Mailchimp's exact error title `Forgotten Email Not Subscribed` with HTTP 400. Mailchimp's API reference does not spell out that title or what the member lookup returns for an archived record; `mailchimp-client.test.ts` pins both as the responses this code expects.

- Mailchimp's error `detail` quotes the submitted address, so it is never stored in `MailchimpResult.error` or logged.
- Both actions validate the `cf-turnstile-response` form field, so render Cloudflare's Turnstile widget inside the form (`lib/integrations/turnstile/README.md`). Turnstile requires HTTPS (auto-disabled in development when its secret key is absent).
- Both actions validate input with Zod; env vars are validated by `mailchimpEnvSchema` in the registry. Validation failures return `{ fieldErrors: Record<string, string> }`; API and network failures return `{ status, message }`; the contact action also repeats the message in `fieldErrors.submit`.
