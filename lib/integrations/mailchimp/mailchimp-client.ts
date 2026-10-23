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

/**
 * Defaults to `'pending'` (double opt-in confirmation email, the GDPR
 * behaviour the README promises). `'subscribed'` skips it for projects with
 * their own lawful basis.
 */
export type MailchimpMemberStatus = 'pending' | 'subscribed'

export interface ContactData {
  name: string
  email: string
  note?: string
  status?: MailchimpMemberStatus
}

export interface SubscriptionData {
  email: string
  firstName?: string | undefined
  lastName?: string | undefined
  status?: MailchimpMemberStatus
}

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

const mailchimpMemberResponseSchema = z.object({
  id: z.string(),
})

const mailchimpErrorResponseSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
})

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

// Mailchimp's member id: MD5 of the lowercased address (not a security use).
function subscriberHash(email: string): string {
  return createHash('md5').update(email.trim().toLowerCase()).digest('hex')
}

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
    timeout: 10000,
  })
}

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
  const response = await makeMailchimpRequest(
    `/lists/${audienceId}/members/${hash}/tags`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    config
  )
  if (!response.ok) {
    throw new Error(`Failed to apply member tags: HTTP ${response.status}`)
  }
}

interface SubscriberPayload {
  email_address: string
  status_if_new: MailchimpMemberStatus
  status?: MailchimpMemberStatus
  merge_fields: { FNAME?: string; LNAME?: string }
}

interface UpsertMemberOptions {
  audienceId: string
  email: string
  firstName: string | undefined
  lastName: string | undefined
  status: MailchimpMemberStatus
  /**
   * Also apply `status` to an address that is already in the audience.
   * Off by default so a re-submission cannot downgrade a confirmed
   * subscriber back to 'pending'.
   */
  forceStatus?: boolean
  config: MailchimpConfig
}

async function upsertMember(
  opts: UpsertMemberOptions
): Promise<
  { ok: true; memberId: string } | { ok: false; result: MailchimpResult }
> {
  const { audienceId, email, firstName, lastName, status, config } = opts
  const hash = subscriberHash(email)

  // `status_if_new` alone: existing members keep their status. Also sending
  // `status` would knock a confirmed subscriber back to 'pending', and they
  // would silently stop receiving mail until they re-confirmed.
  const subscriberData: SubscriberPayload = {
    email_address: email,
    status_if_new: status,
    merge_fields: {},
  }
  if (firstName !== undefined) subscriberData.merge_fields.FNAME = firstName
  if (lastName !== undefined) subscriberData.merge_fields.LNAME = lastName
  if (opts.forceStatus) {
    subscriberData.status = status
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

    const nameParts = contactData.name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const upsert = await upsertMember({
      audienceId,
      email: contactData.email,
      firstName,
      lastName,
      status: contactData.status ?? 'pending',
      config,
    })

    if (!upsert.ok) {
      return upsert.result
    }

    // Tags are optional segmentation; a supplied note must be stored for success.
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
      const response = await makeMailchimpRequest(
        `/lists/${audienceId}/members/${upsert.memberId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ note: contactData.note }),
        },
        config
      )
      if (!response.ok) {
        return {
          success: false,
          errorCode: 'api_error',
          error: 'Failed to store contact note',
        }
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
      firstName: subscriptionData.firstName,
      lastName: subscriptionData.lastName,
      status: subscriptionData.status ?? 'pending',
      config,
    })

    if (!upsert.ok) {
      console.error(
        'Mailchimp subscription error:',
        upsert.result.error || 'Failed to subscribe'
      )
      return upsert.result
    }

    // Tagging is best-effort.
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
