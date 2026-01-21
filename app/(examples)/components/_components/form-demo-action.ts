'use server'

import type { FormState } from '@/components/ui/form/types'

// Demo server action (simulated)
export async function demoFormAction(
  _prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const email = formData.get('email') as string
  const name = formData.get('name') as string
  const message = formData.get('message') as string

  // Simulate validation
  if (!email?.includes('@')) {
    return { status: 400, message: 'Please enter a valid email address' }
  }

  if (!name || name.length < 2) {
    return { status: 400, message: 'Name must be at least 2 characters' }
  }

  console.log('Form submitted:', { email, name, message })

  return { status: 200, message: 'Form submitted successfully!' }
}
