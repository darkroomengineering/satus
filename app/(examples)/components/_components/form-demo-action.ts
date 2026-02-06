'use server'

import { z } from 'zod'
import type { FormState } from '@/components/ui/form/types'
import { emailSchema, parseFormData } from '@/utils/validation'

// Demo server action (simulated)
export async function demoFormAction(
  _prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const schema = z.object({
    email: emailSchema,
    name: z.string().min(2, { error: 'Name must be at least 2 characters' }),
    message: z.string().optional(),
  })

  const result = parseFormData(schema, formData)

  if (!('success' in result)) {
    return result
  }

  console.log('Form submitted:', result.data)

  return { status: 200, message: 'Form submitted successfully!' }
}
