'use server'

import type { FormState } from '@/lib/types/form'
import { runFormAction } from '@/lib/utils/form-action'

import {
  addContactToMailchimp,
  addSubscriberToMailchimp,
} from './mailchimp-client'
import {
  mailchimpContactNote,
  mailchimpContactSchema,
  mailchimpSubscriptionSchema,
} from './schema'

export async function mailchimpContactAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'mailchimp-contact',
    schema: mailchimpContactSchema,
    formData,
    turnstile: true,
    run: async (input) => {
      const result = await addContactToMailchimp({
        name: input.name,
        email: input.email,
        note: mailchimpContactNote(input),
      })
      if (!result.success) {
        const forgotten = result.errorCode === 'forgotten_email'
        const message = forgotten
          ? 'email_permanently_deleted_'
          : 'submission_failed_'
        return {
          status: forgotten ? 409 : 500,
          message,
          fieldErrors: { submit: message },
        }
      }
      return { status: 200, message: 'message_sent_' }
    },
  })
}

export async function mailchimpSubscriptionAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'mailchimp-subscribe',
    schema: mailchimpSubscriptionSchema,
    formData,
    turnstile: true,
    run: async (input) => {
      const result = await addSubscriberToMailchimp(input)
      if (!result.success) {
        // `result.error` holds the HTTP status and Mailchimp's error title.
        // Mailchimp's `detail`, which quotes the submitted address, is never in it.
        console.error('Mailchimp subscription failed:', result.error)
        if (result.errorCode === 'forgotten_email') {
          return { status: 409, message: 'email_permanently_deleted_' }
        }
        const errorMessage =
          result.errorCode === 'invalid_email'
            ? 'invalid_email_'
            : 'subscription_failed_'
        return { status: 500, message: errorMessage }
      }
      return { status: 200, message: 'subscription_successful_' }
    },
  })
}
