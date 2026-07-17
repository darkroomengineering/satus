import { createHash } from 'node:crypto'
import { z } from 'zod'
import { env } from '@/lib/env'
import { isConfigured } from '@/lib/integrations/registry'
import { fetchWithTimeout } from '@/utils/fetch'
import { parseApiResponse } from '@/utils/validation'

export interface MailchimpConfig {
  apiKey: string
  serverPrefix: string
  audienceId: string
}

export interface ContactData {
  name: string
  email: string
  note?: string
}

export interface SubscriptionData {
  email: string
  firstName?: string | undefined
  lastName?: string | undefined
}

// Typed error codes surfaced to callers
export type MailchimpErrorCode =
  | 'invalid_email'
  | 'network_error'
  | 'api_error'
  | 'config_error'

export interface MailchimpResult {
  success: boolean
  errorCode?: MailchimpErrorCode
  /** Human-readable detail; not for UI routing — use errorCode for that */
  error?: string
}

// Zod schema for the Mailchimp member PUT response (only fields we consume)
const mailchimpMemberResponseSchema = z.object({
  id: z.string(),
})

// Zod schema for Mailchimp API error responses (only fields we consume)
const mailchimpErrorResponseSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
})

// Get Mailchimp configuration from environment variables
function getMailchimpConfig(): MailchimpConfig {
  const apiKey = env.MAILCHIMP_API_KEY
  const serverPrefix = env.MAILCHIMP_SERVER_PREFIX
  const audienceId = env.MAILCHIMP_AUDIENCE_ID

  if (!(isConfigured('mailchimp') && apiKey && serverPrefix && audienceId)) {
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

// Base Mailchimp API client — config is threaded in to avoid repeated reads
async function makeMailchimpRequest(
  endpoint: string,
  options: RequestInit,
  config: MailchimpConfig
): Promise<Response> {
  const { apiKey, serverPrefix } = config

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

// Apply tags to a member via the dedicated tags endpoint (best-effort)
async function applyMemberTags(
  audienceId: string,
  email: string,
  tags: string[],
  config: MailchimpConfig
): Promise<void> {
  const hash = subscriberHash(email)
  const body = {
    tags: tags.map((name) => ({ name, status: 'active' })),
  }
  await makeMailchimpRequest(
    `/lists/${audienceId}/members/${hash}/tags`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    config
  )
}

// ---------------------------------------------------------------------------
// Private helper: upsert a member via PUT
// ---------------------------------------------------------------------------

interface UpsertMemberOptions {
  audienceId: string
  email: string
  firstName: string
  lastName: string
  config: MailchimpConfig
}

/**
 * PUT a member into the audience. Returns the validated member response on
 * success, or a MailchimpResult error on failure.
 */
async function upsertMember(
  opts: UpsertMemberOptions
): Promise<
  { ok: true; memberId: string } | { ok: false; result: MailchimpResult }
> {
  const { audienceId, email, firstName, lastName, config } = opts
  const hash = subscriberHash(email)

  const subscriberData = {
    email_address: email,
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
    },
    config
  )

  if (response.ok) {
    const json: unknown = await response.json()
    const member = parseApiResponse(
      mailchimpMemberResponseSchema,
      json,
      'Mailchimp members API'
    )
    return { ok: true, memberId: member.id }
  }

  const errorJson: unknown = await response.json().catch(() => ({}))
  const errorData = mailchimpErrorResponseSchema.safeParse(errorJson).data ?? {}
  const detail = errorData.detail || 'Failed to add/update member'

  // Classify the error so callers can branch by code, not string-sniff
  const lowerDetail = detail.toLowerCase()
  const errorCode: MailchimpErrorCode =
    lowerDetail.includes('fake') || lowerDetail.includes('invalid')
      ? 'invalid_email'
      : 'api_error'

  return {
    ok: false,
    result: { success: false, errorCode, error: detail },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Add or update a contact in Mailchimp
export async function addContactToMailchimp(
  contactData: ContactData
): Promise<MailchimpResult> {
  let config: MailchimpConfig
  try {
    config = getMailchimpConfig()
  } catch (error) {
    console.error('Mailchimp config error:', error)
    return {
      success: false,
      errorCode: 'config_error',
      error:
        error instanceof Error
          ? error.message
          : 'Missing Mailchimp configuration',
    }
  }

  try {
    const { audienceId } = config

    // Split name into first and last name
    const nameParts = contactData.name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const upsert = await upsertMember({
      audienceId,
      email: contactData.email,
      firstName,
      lastName,
      config,
    })

    if (!upsert.ok) {
      return upsert.result
    }

    // --- best-effort: tag and note failures do NOT fail the overall op ---

    try {
      await applyMemberTags(
        audienceId,
        contactData.email,
        ['contact-form'],
        config
      )
    } catch (err) {
      console.error('Mailchimp contact tag error (non-fatal):', err)
    }

    if (contactData.note) {
      try {
        await makeMailchimpRequest(
          `/lists/${audienceId}/members/${upsert.memberId}/notes`,
          {
            method: 'POST',
            body: JSON.stringify({ note: contactData.note }),
          },
          config
        )
      } catch (err) {
        console.error('Mailchimp contact note error (non-fatal):', err)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Mailchimp contact error:', error)
    return {
      success: false,
      errorCode: 'network_error',
      error: 'Network error occurred',
    }
  }
}

// Add a subscriber to Mailchimp (for newsletter signups)
export async function addSubscriberToMailchimp(
  subscriptionData: SubscriptionData
): Promise<MailchimpResult> {
  let config: MailchimpConfig
  try {
    config = getMailchimpConfig()
  } catch (error) {
    console.error('Mailchimp config error:', error)
    return {
      success: false,
      errorCode: 'config_error',
      error:
        error instanceof Error
          ? error.message
          : 'Missing Mailchimp configuration',
    }
  }

  try {
    const { audienceId } = config

    const upsert = await upsertMember({
      audienceId,
      email: subscriptionData.email,
      firstName: subscriptionData.firstName ?? '',
      lastName: subscriptionData.lastName ?? '',
      config,
    })

    if (!upsert.ok) {
      console.error(
        'Mailchimp subscription error:',
        upsert.result.error || 'Failed to subscribe'
      )
      return upsert.result
    }

    // best-effort tag application
    try {
      await applyMemberTags(
        audienceId,
        subscriptionData.email,
        ['newsletter'],
        config
      )
    } catch (err) {
      console.error('Mailchimp newsletter tag error (non-fatal):', err)
    }

    return { success: true }
  } catch (error) {
    console.error('Mailchimp subscription error:', error)
    return {
      success: false,
      errorCode: 'network_error',
      error: 'Network error occurred',
    }
  }
}
