'use server'

import { z } from 'zod'

import type { FormState } from '@/lib/types/form'
import { runFormAction } from '@/lib/utils/form-action'
import { emailSchema } from '@/utils/validation'

import {
  addContactToMailchimp,
  addSubscriberToMailchimp,
} from './mailchimp-client'

const contactSchema = z.object({
  name: z.string().min(1, { error: 'name_required_' }),
  email: emailSchema,
  subject: z.string().min(1, { error: 'subject_required_' }),
  message: z.string().min(1, { error: 'message_required_' }),
})

const subscriptionSchema = z.object({
  email: emailSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

// Contact form action
export async function mailchimpContactAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'mailchimp-contact',
    schema: contactSchema,
    formData,
    turnstile: true,
    run: async (input) => {
      const result = await addContactToMailchimp({
        name: input.name,
        email: input.email,
        note: `Contact form submission - Subject: ${input.subject}\n\nMessage: ${input.message}`,
      })
      if (!result.success) {
        return {
          status: 500,
          message: 'submission_failed_',
          fieldErrors: { submit: 'submission_failed_' },
        }
      }
      return { status: 200, message: 'message_sent_' }
    },
  })
}

// Newsletter subscription action
export async function mailchimpSubscriptionAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'mailchimp-subscribe',
    schema: subscriptionSchema,
    formData,
    turnstile: true,
    run: async (input) => {
      const result = await addSubscriberToMailchimp(input)
      if (!result.success) {
        const errorMessage =
          result.errorCode === 'invalid_email'
            ? 'invalid_email_'
            : 'subscription_failed_'

        console.error('Mailchimp subscription failed:', result.error)
        return { status: 500, message: errorMessage }
      }
      return { status: 200, message: 'subscription_successful_' }
    },
  })
}
