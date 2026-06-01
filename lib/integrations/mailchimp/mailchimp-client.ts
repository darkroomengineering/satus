import { createHash } from 'node:crypto'
import { fetchWithTimeout } from '@/utils/fetch'

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
  firstName?: string | undefined
  lastName?: string | undefined
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

// Compute the MD5 subscriber hash Mailchimp uses for member lookup
function subscriberHash(email: string): string {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex')
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

// Apply tags to a member via the dedicated tags endpoint
async function applyMemberTags(
  audienceId: string,
  email: string,
  tags: string[]
): Promise<void> {
  const hash = subscriberHash(email)
  const body = {
    tags: tags.map((name) => ({ name, status: 'active' })),
  }
  await makeMailchimpRequest(`/lists/${audienceId}/members/${hash}/tags`, {
    method: 'POST',
    body: JSON.stringify(body),
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

    const hash = subscriberHash(contactData.email)

    const subscriberData = {
      email_address: contactData.email,
      status_if_new: 'subscribed',
      status: 'subscribed',
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
      },
    }

    const response = await makeMailchimpRequest(
      `/lists/${audienceId}/members/${hash}`,
      {
        method: 'PUT',
        body: JSON.stringify(subscriberData),
      }
    )

    if (response.ok) {
      // Apply the contact-form tag via the dedicated tags endpoint
      await applyMemberTags(audienceId, contactData.email, ['contact-form'])

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
export async function addSubscriberToMailchimp(
  subscriptionData: SubscriptionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { audienceId } = getMailchimpConfig()

    const hash = subscriberHash(subscriptionData.email)

    const subscriberData = {
      email_address: subscriptionData.email,
      status_if_new: 'subscribed',
      status: 'subscribed',
      merge_fields: {
        FNAME: subscriptionData.firstName ?? '',
        LNAME: subscriptionData.lastName ?? '',
      },
    }

    const response = await makeMailchimpRequest(
      `/lists/${audienceId}/members/${hash}`,
      {
        method: 'PUT',
        body: JSON.stringify(subscriberData),
      }
    )

    if (response.ok) {
      // Apply the newsletter tag via the dedicated tags endpoint
      await applyMemberTags(audienceId, subscriptionData.email, ['newsletter'])
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
