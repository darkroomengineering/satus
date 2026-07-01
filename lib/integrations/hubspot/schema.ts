import { z } from 'zod'
import { emailSchema } from '@/utils/validation'

/**
 * Validation schema for the HubSpot newsletter action.
 *
 * Kept in its own module (not `action.ts`) because that file carries the
 * `'use server'` directive, and server-action modules may only export async
 * functions — a non-async export there fails the build. The action and its
 * unit test both import the schema from here.
 */
export const hubspotNewsletterSchema = z.object({
  email: emailSchema,
  formId: z.string().min(1, { error: 'Form ID is required' }),
})
