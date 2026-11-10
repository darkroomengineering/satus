import { z } from 'zod'

import { emailSchema } from '@/utils/validation'

// Not in `action.ts`: a 'use server' module may export only async functions,
// and a non-async export fails the build.
export const mailchimpContactSchema = z.object({
  name: z
    .string()
    .min(1, { error: 'name_required_' })
    .max(100, { error: 'name_too_long_' }),
  email: emailSchema,
  // Mailchimp limits a member note to 1,000 characters, and
  // `mailchimpContactNote` wraps these two in 46: 46 + 100 + 850 = 996.
  subject: z
    .string()
    .min(1, { error: 'subject_required_' })
    .max(100, { error: 'subject_too_long_' }),
  message: z
    .string()
    .min(1, { error: 'message_required_' })
    .max(850, { error: 'message_too_long_' }),
})

export function mailchimpContactNote({
  subject,
  message,
}: {
  subject: string
  message: string
}): string {
  return `Contact form submission - Subject: ${subject}\n\nMessage: ${message}`
}

export const mailchimpSubscriptionSchema = z.object({
  email: emailSchema,
  firstName: z.string().max(100, { error: 'first_name_too_long_' }).optional(),
  lastName: z.string().max(100, { error: 'last_name_too_long_' }).optional(),
})
