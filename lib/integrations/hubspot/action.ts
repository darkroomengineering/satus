// USAGE — HubSpot Forms
// 1. Set env vars: NEXT_PUBLIC_HUBSPOT_PORTAL_ID (embed widget), and the
//    form's own ID (passed to the action below, e.g. from an embedded form's
//    `formId` field or hardcoded in the page).
//
// 2. Wire the server action to a form that submits an `email` and `formId`:
//
//   import { Form } from '@/components/ui/form'
//   import { HubspotNewsletterAction } from '@/integrations/hubspot/action'
//
//   export default function NewsletterPage() {
//     return (
//       <Form action={HubspotNewsletterAction}>
//         <input type="hidden" name="formId" value="your-hubspot-form-id" />
//         <input type="email" name="email" placeholder="Your email" required />
//         <button type="submit">Subscribe</button>
//       </Form>
//     )
//   }
//
// 3. The server action validates with Zod and posts to the HubSpot Forms v3 API.
//    Rate limiting and Turnstile verification are applied automatically via
//    runFormAction, in that order — render a Turnstile widget in the form
//    (see lib/integrations/turnstile/README.md) so the widget's token lands
//    in the `cf-turnstile-response` field.
//
// Full walkthrough: see the manual (app/(site)/page.tsx) step 5 "Add a plugin".

'use server'

import { env } from '@/lib/env'
import type { FormState } from '@/lib/types/form'
import { runFormAction } from '@/lib/utils/form-action'
import { fetchWithTimeout } from '@/utils/fetch'

import { hubspotNewsletterSchema } from './schema'

export async function HubspotNewsletterAction(
  _: FormState | null,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'hubspot',
    schema: hubspotNewsletterSchema,
    formData,
    turnstile: true,
    rateLimitMessage: 'Too many requests. Please try again later.',
    run: async ({ email, formId }) => {
      const allowedFormIds = env.HUBSPOT_ALLOWED_FORM_IDS
      if (allowedFormIds) {
        const allowList = allowedFormIds.split(',').flatMap((id) => {
          const trimmed = id.trim()
          return trimmed ? [trimmed] : []
        })
        if (!allowList.includes(formId)) {
          return {
            status: 400,
            message: 'invalid_input_',
            fieldErrors: { formId: 'Form is not allowed' },
          }
        }
      }

      const portalId = env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
      if (!portalId) {
        return {
          status: 500,
          message: 'HubSpot portal ID is not configured.',
        }
      }

      const body = {
        fields: [{ name: 'email', value: email }],
      }

      const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`

      try {
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000, // 8 second timeout for HubSpot API
        })

        if (!response.ok) {
          throw new Error(`Failed to submit to hubspot: ${response.status}`)
        }

        return { status: 200, message: 'submitted to Hubspot successfully' }
      } catch (error) {
        console.error(`Error submitting to hubspot form: ${formId}`, error)
        return { status: 500, message: 'Failed to submit to hubspot' }
      }
    },
  })
}
