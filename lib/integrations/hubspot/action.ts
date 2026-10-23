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
      } else if (process.env.NODE_ENV === 'production') {
        // Fail closed in production, fail open in development
        console.error('HUBSPOT_ALLOWED_FORM_IDS not configured in production')
        return { status: 500, message: 'security_configuration_error_' }
      } else {
        console.warn(
          'HUBSPOT_ALLOWED_FORM_IDS not set - allowing any formId in development'
        )
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
          timeout: 8000,
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
