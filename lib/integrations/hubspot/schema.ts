import { z } from 'zod'

import { emailSchema } from '@/utils/validation'

// Not in `action.ts`: a 'use server' module may export only async functions,
// and a non-async export fails the build.
export const hubspotNewsletterSchema = z.object({
  email: emailSchema,
  formId: z.string().min(1, { error: 'Form ID is required' }),
})
