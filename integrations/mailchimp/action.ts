'use server'

import type { ErrorField, FormState } from '~/components/form/types'
import { fetchWithTimeout } from '~/libs/fetch-with-timeout'
import { validateFormWithTurnstile } from './turnstile'

// Type declarations for Node.js globals in Next.js server environment
declare const process: {
  env: {
    MAILCHIMP_API_KEY?: string
    MAILCHIMP_SERVER_PREFIX?: string
    MAILCHIMP_AUDIENCE_ID?: string
  }
}

declare const Buffer: {
  from(
    str: string,
    encoding?: string
  ): {
    toString(encoding: string): string
  }
}

export interface MailchimpConfig {
  apiKey: string
  serverPrefix: string
  audienceId: string
}

export interface ContactData {
  name: string
  email: string
  subject: string
  message: string
}

export interface SubscriptionData {
  email: string
  firstName?: string
  lastName?: string
}

// Mailchimp API error response type
interface MailchimpErrorResponse {
  type: string
  title: string
  detail: string
  instance?: string
}

// Get Mailchimp configuration from environment variables
function getMailchimpConfig(): MailchimpConfig {
  const apiKey = process.env.MAILCHIMP_API_KEY
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID

  if (!(apiKey && serverPrefix && audienceId)) {
    throw new Error(
      'Missing Mailchimp configuration. Please check your environment variables.'
    )
  }

  return { apiKey, serverPrefix, audienceId }
}

// Base Mailchimp API client
async function makeMailchimpRequest(
  endpoint: string,
  options: RequestInit
): Promise<Response> {
  const { apiKey, serverPrefix } = getMailchimpConfig()

  const url = `https://${serverPrefix}.api.mailchimp.com/3.0${endpoint}`
  const auth = Buffer.from(`anystring:${apiKey}`, 'utf8').toString('base64')

  return fetchWithTimeout(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    timeout: 10000, // 10 second timeout for Mailchimp API
  })
}

// Add or update a contact in Mailchimp
export async function addContactToMailchimp(
  contactData: ContactData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { audienceId } = getMailchimpConfig()

    // Split name into first and last name
    const nameParts = contactData.name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const subscriberData = {
      email_address: contactData.email,
      status: 'subscribed', // Use 'pending' for double opt-in, 'subscribed' for single
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
      },
      tags: ['contact-form'],
    }

    const response = await makeMailchimpRequest(
      `/lists/${audienceId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(subscriberData),
      }
    )

    if (response.ok) {
      // Add a note about the contact form submission
      const data = (await response.json()) as { id: string }
      const subscriberId = data.id

      const noteData = {
        note: `Contact form submission - Subject: ${contactData.subject}\n\nMessage: ${contactData.message}`,
      }

      await makeMailchimpRequest(
        `/lists/${audienceId}/members/${subscriberId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify(noteData),
        }
      )

      return { success: true }
    }
    const errorData = (await response.json()) as MailchimpErrorResponse
    return {
      success: false,
      error: errorData.detail || 'Failed to add contact',
    }
  } catch (error) {
    console.error('Mailchimp contact error:', error)
    return { success: false, error: 'Network error occurred' }
  }
}

// Add a subscriber to Mailchimp (for newsletter signups)
async function addSubscriberToMailchimp(
  subscriptionData: SubscriptionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { audienceId } = getMailchimpConfig()

    const subscriberData = {
      email_address: subscriptionData.email,
      status: 'subscribed', // Use 'pending' for double opt-in, 'subscribed' for single
      merge_fields: {
        FNAME: subscriptionData.firstName || '',
        LNAME: subscriptionData.lastName || '',
      },
      tags: ['newsletter'],
    }

    const response = await makeMailchimpRequest(
      `/lists/${audienceId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(subscriberData),
      }
    )

    if (response.ok) {
      return { success: true }
    }

    const errorData = (await response.json()) as MailchimpErrorResponse
    console.error(
      'Mailchimp subscription error:',
      errorData.detail || 'Failed to subscribe'
    )
    return { success: false, error: errorData.detail || 'Failed to subscribe' }
  } catch (error) {
    console.error('Mailchimp subscription error:', error)
    return { success: false, error: 'Network error occurred' }
  }
}

// Contact form action (replaces the mock action)
export async function mailchimpContactAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  const rawData = {
    name: formData.get('name')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    subject: formData.get('subject')?.toString() || '',
    message: formData.get('message')?.toString() || '',
  }

  const errors = new Map() as ErrorField

  // Turnstile validation (invisible spam protection)
  const turnstileValidation = await validateFormWithTurnstile(formData)
  if (!turnstileValidation.isValid) {
    for (const error of turnstileValidation.errors) {
      errors.set('turnstile', { state: true, message: error })
    }
  }

  // Basic validation
  if (!rawData.name.trim()) {
    errors.set('name', { state: true, message: 'name_required_' })
  }

  if (!rawData.email.trim()) {
    errors.set('email', { state: true, message: 'email_required_' })
  }

  if (!rawData.subject.trim()) {
    errors.set('subject', { state: true, message: 'subject_required_' })
  }

  if (!rawData.message.trim()) {
    errors.set('message', { state: true, message: 'message_required_' })
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (rawData.email && !emailRegex.test(rawData.email)) {
    errors.set('email', { state: true, message: 'invalid_email_format_' })
  }

  if (errors.size > 0) {
    return {
      status: 400,
      message: 'invalid_input_',
      errors,
      inputs: rawData,
    }
  }

  // Send to Mailchimp
  const result = await addContactToMailchimp(rawData)

  if (!result.success) {
    errors.set('submit', { state: true, message: 'submission_failed_' })
    return {
      status: 500,
      message: 'submission_failed_',
      errors,
      inputs: rawData,
    }
  }

  return {
    status: 200,
    message: 'message_sent_',
    inputs: {},
    errors: new Map(),
  }
}

// Newsletter subscription action
export async function mailchimpSubscriptionAction(
  _initialState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get('email')?.toString() || ''
  const firstName = formData.get('firstName')?.toString() || ''
  const lastName = formData.get('lastName')?.toString() || ''

  const errors = new Map() as ErrorField

  // Turnstile validation (invisible spam protection)
  const turnstileValidation = await validateFormWithTurnstile(formData)
  if (!turnstileValidation.isValid) {
    for (const error of turnstileValidation.errors) {
      errors.set('turnstile', { state: true, message: error })
    }
  }

  if (!email.trim()) {
    errors.set('email', { state: true, message: 'email_required_' })
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (email && !emailRegex.test(email)) {
    errors.set('email', { state: true, message: 'invalid_email_format_' })
  }

  if (errors.size > 0) {
    return {
      status: 400,
      message: 'invalid_input_',
      errors,
      inputs: { email, firstName, lastName },
    }
  }

  // Subscribe to Mailchimp
  const result = await addSubscriberToMailchimp({ email, firstName, lastName })

  if (!result.success) {
    // Check for "already subscribed" case - treat as success with friendly message
    if (
      result.error?.includes('already') ||
      result.error?.includes('Member Exists') ||
      result.error?.includes('is already a list member')
    ) {
      return {
        status: 200,
        message: 'already_subscribed_',
        inputs: {},
        errors: new Map(),
      }
    }

    // Handle other error types
    let errorMessage = 'subscription_failed_'
    if (result.error?.includes('fake') || result.error?.includes('invalid')) {
      errorMessage = 'invalid_email_'
    }

    console.error('Mailchimp subscription failed:', result.error)

    return {
      status: 500,
      message: errorMessage,
      errors: new Map(),
      inputs: { email, firstName, lastName },
    }
  }

  return {
    status: 200,
    message: 'subscription_successful_',
    inputs: {},
    errors: new Map(),
  }
}
