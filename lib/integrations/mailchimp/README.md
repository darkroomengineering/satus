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

`mailchimpContactAction` (same module) handles a contact form instead: its schema requires `name`, `email`, `subject`, and `message`; it adds the contact to the audience if it is new and posts the message as a note on a new, subscribed or pending member. For those members a note that fails to store on a server error (5xx), a rate limit (429) or a network failure returns an error even if the contact was saved, and a note Mailchimp refuses with any other 4xx is logged while the visitor gets the success. For any other existing record the message is not stored and the visitor gets the same success (see Behavior). It returns the same `FormState` shape as `mailchimpSubscriptionAction`.

## Behavior

- Double opt-in (GDPR compliant): new members are added with `status: 'pending'` by default, which sends Mailchimp's confirmation email, so new subscribers appear as "Pending" until they confirm. Pass `status: 'subscribed'` to `addContactToMailchimp` / `addSubscriberToMailchimp` to skip it for projects with their own lawful basis for single opt-in.
- Tagging is optional: failures are logged without rejecting a saved contact or subscription.
- A submission never changes an existing member's name or status. The names it carries are set only when it creates a new member, and any existing record for the address, archived included, is left as it is. A submission that succeeds gets the same reply whether the address is new or has a record. The reply can differ by the state of the address in these cases:
  - A create that Mailchimp rejects (a fake or invalid address, a permanently deleted one, a compliance state, a rejected merge field) can only happen for an address whose lookup found no record, so that error tells the visitor the address has none.
  - A contact note that fails to store on a 5xx, a 429 or a network error returns `submission_failed_` only for a new, subscribed or pending address. Any other record is sent no note and gets the success.
  - Response timing differs with the number of Mailchimp requests: a new address takes the lookup, the create and the writes, a subscribed or pending member the lookup and the writes, any other record the lookup alone.
- A contact note Mailchimp refuses with a 4xx other than 429 is not stored, and the visitor gets `message_sent_`. An error there would reach only new, subscribed and pending addresses, which lets a visitor test whether an address left the list. The cost: the message is lost while its sender is told it was sent, and the log line `Mailchimp contact note refused: HTTP <status>` is the only trace. A 5xx, a 429 or a network error on the note fails the submission and logs `Mailchimp contact note error:` with the HTTP status or the error's name. Neither line carries the address, the name, the note or Mailchimp's response body.
- The tag, and on the contact form the note, are written only to a member the submission creates or one whose status is `subscribed` or `pending`. `pending` is the state the forms themselves create under double opt-in, so a repeat contact message from an address that has not confirmed is stored like the first. The status comes from the same lookup that checks for the record (`?fields=id,status`), one read per submission. An archived, unsubscribed, cleaned or transactional member gets nothing written, so an anonymous visitor cannot tag or annotate someone who left the list. The same holds when the lookup returns no status or one this code does not know, and when the record appears between the lookup and the create (Mailchimp answers the create with `Member Exists`). The cost: a contact message from an archived, unsubscribed, cleaned or transactional address is discarded while the visitor gets `message_sent_`. This protection assumes Mailchimp's member lookup returns 200 with a `status` for archived, unsubscribed and cleaned records. That was not checked against the live API: if the lookup answers 404 for one of them, the form attempts a create with the submitted name.
- What a submission does depends on the record Mailchimp holds for the address:

  | Record for the address                           | What the form does                                                             | What the visitor gets                                                                                |
  | ------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
  | None                                             | Creates the member (`pending` by default); stores the tag and the contact note | Success: `subscription_successful_` / `message_sent_`                                                |
  | Subscribed or pending                            | Leaves the name and status alone; stores the tag and the contact note          | The same success                                                                                     |
  | Unsubscribed, cleaned, archived or transactional | Writes nothing: no name, status, tag or note                                   | The same success                                                                                     |
  | Permanently deleted                              | Stores nothing: Mailchimp refuses to re-add the address through its API        | Status 409 with `email_permanently_deleted_` (the contact action repeats it in `fieldErrors.submit`) |

  An archived member is not re-subscribed by a form: doing that would mean writing to an existing record on an anonymous visitor's word. For a permanently deleted address, give `email_permanently_deleted_` copy that points to your Mailchimp-hosted signup form; `Messages` renders the key as written. The cost of the distinct reply: anyone who types an address learns that it was permanently deleted from this audience, one of the rejected creates listed above. The client reports this case as `errorCode: 'forgotten_email'`, matched on Mailchimp's exact error title `Forgotten Email Not Subscribed` with HTTP 400. Mailchimp's API reference does not spell out that title or what the member lookup returns for an archived record; `mailchimp-client.test.ts` pins both, and the `status` value for each row above, as the responses this code expects.

- Mailchimp's error `detail` quotes the submitted address, so it is never stored in `MailchimpResult.error` or logged. When the lookup or the create fails, the client logs one line with the HTTP status and Mailchimp's error title (`Mailchimp contact error:` / `Mailchimp subscription error:`); the address, the name and the message are never in it. A title outside the known set has the submitted address removed, is cut to 80 characters and has its whitespace flattened; the address is matched in lowercase, so a title that quotes it is logged in lowercase. A create that succeeds with a body that is not JSON fails with the fixed text `Failed to add member: HTTP <status> with an unreadable body`, because a JSON parse error's message can quote the member record. The cost: that member exists with no tag or note, and the visitor is told the submission failed.
- The client reports a fake or invalid address as `errorCode: 'invalid_email'` by searching `detail` for "fake" or "invalid". The submitted address is removed from `detail` first, in any letter case, so an address such as `invalid@example.com` that Mailchimp rejects for another reason is an `api_error`. The title on that rejection in the test fixture, `Invalid Resource`, is not specific to it, so the title is not what is matched. The cost: another validation error whose `detail` uses either word is still reported as `invalid_email`.
- Text fields have maximum lengths: `name`, `firstName` and `lastName` 100 characters, `subject` 100, `message` 850. A longer value fails validation with `name_too_long_`, `first_name_too_long_`, `last_name_too_long_`, `subject_too_long_` or `message_too_long_` in `fieldErrors`. The subject and message limits keep the contact note within Mailchimp's 1,000 characters per note: `mailchimpContactNote` (`schema.ts`) wraps the two in 46 characters, so the longest note is 996.
- Both actions validate the `cf-turnstile-response` form field, so render Cloudflare's Turnstile widget inside the form (`lib/integrations/turnstile/README.md`). Turnstile requires HTTPS (auto-disabled in development when its secret key is absent).
- Both actions validate input with Zod; env vars are validated by `mailchimpEnvSchema` in the registry. Validation failures return `{ fieldErrors: Record<string, string> }`; API and network failures return `{ status, message }`; the contact action also repeats the message in `fieldErrors.submit`.
