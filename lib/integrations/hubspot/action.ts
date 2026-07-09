// USAGE — HubSpot Forms
// 1. Set env vars: HUBSPOT_ACCESS_TOKEN, NEXT_PUBLIC_HUBSPOT_PORTAL_ID, NEXT_HUBSPOT_FORM_ID
//
// 2. Fetch the form definition and render it in a Server Component page:
//
//   import { Form } from '@/components/ui/form'
//   import { HubspotNewsletterAction } from '@/integrations/hubspot/action'
//   import { getForm } from '@/integrations/hubspot/fetch-form'
//
//   export default async function NewsletterPage() {
//     const result = await getForm(process.env.NEXT_HUBSPOT_FORM_ID)
//     if ('error' in result) return <p>Form not configured.</p>
//     return (
//       <Form action={HubspotNewsletterAction} formId={result.form.id}>
//         <input type="email" name="email" placeholder="Your email" required />
//         <button type="submit">Subscribe</button>
//       </Form>
//     )
//   }
//
// 3. The server action validates with Zod and posts to the HubSpot Forms v3 API.
//    Rate limiting is applied automatically via runFormAction.
//
// Full walkthrough: see the manual (app/page.tsx) step 5 "Add a plugin".

'use server'

import { env } from '@/lib/env'
import type { TurnstileValidationResult } from '@/lib/integrations/turnstile'
import { validateFormWithTurnstile } from '@/lib/integrations/turnstile'
import type { FormState } from '@/lib/types/form'
import { runFormAction } from '@/lib/utils/form-action'
import { fetchWithTimeout } from '@/utils/fetch'
import { hubspotNewsletterSchema } from './schema'

function turnstileError(validation: TurnstileValidationResult): FormState {
  return {
    status: 400,
    message: 'invalid_input_',
    fieldErrors: {
      turnstile: validation.errors[0] ?? 'security_verification_required_',
    },
  }
}

export async function HubspotNewsletterAction(
  _: unknown,
  formData: FormData
): Promise<FormState> {
  const turnstileValidation = await validateFormWithTurnstile(formData)
  if (!turnstileValidation.isValid) {
    return turnstileError(turnstileValidation)
  }

  return runFormAction({
    rateLimitPrefix: 'hubspot',
    schema: hubspotNewsletterSchema,
    formData,
    rateLimitMessage: 'Too many requests. Please try again later.',
    run: async ({ email, formId }) => {
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
