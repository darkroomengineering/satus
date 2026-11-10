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
  /** The address was permanently deleted from the audience; Mailchimp calls that "forgotten" and refuses to re-add it through the API. */
  | 'forgotten_email'
  | 'network_error'
  | 'api_error'
  | 'config_error'

export interface MailchimpResult {
  success: boolean
  errorCode?: MailchimpErrorCode
  /**
   * For logs, not for UI routing (use errorCode). Mailchimp's `detail` is never
   * stored here or logged: it quotes the submitted address.
   */
  error?: string
}

const FORGOTTEN_EMAIL_TITLE = 'Forgotten Email Not Subscribed'

// Titles logged verbatim. Any other title is unbounded text from Mailchimp, so
// the submitted address is removed from it, it is cut to 80 characters and its
// whitespace flattened before it is logged. The address is matched in
// lowercase, so a title that quotes it is logged in lowercase.
const KNOWN_ERROR_TITLES = new Set([
  'Member Exists',
  'Invalid Resource',
  FORGOTTEN_EMAIL_TITLE,
  'Resource Not Found',
  'Member In Compliance State',
])

function loggableTitle(title: string, email: string): string {
  if (KNOWN_ERROR_TITLES.has(title)) return title
  const address = email.trim().toLowerCase()
  const lowerTitle = title.toLowerCase()
  const withoutAddress =
    address && lowerTitle.includes(address)
      ? lowerTitle.replaceAll(address, '')
      : title
  return withoutAddress.slice(0, 80).replace(/\s+/g, ' ')
}

// Logs get a caught error's name and message, not the object: its other
// properties are whatever the thrower attached.
function describeCause(cause: unknown): string {
  return cause instanceof Error
    ? `${cause.name}: ${cause.message}`
    : String(cause)
}

const mailchimpMemberResponseSchema = z.object({
  id: z.string(),
})

const mailchimpMemberLookupSchema = z.object({
  status: z.string(),
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

interface NewMemberPayload {
  email_address: string
  status: MailchimpMemberStatus
  merge_fields: { FNAME?: string; LNAME?: string }
}

interface AddMemberOptions {
  audienceId: string
  email: string
  firstName: string | undefined
  lastName: string | undefined
  status: MailchimpMemberStatus
  config: MailchimpConfig
}

type MemberOutcome =
  /** Created by this submission, or an existing record whose status is `subscribed` or `pending`: tags and the contact note are written. */
  | { kind: 'writable'; memberId: string }
  /** An existing record in any other state: nothing is written to it. */
  | { kind: 'untouched' }
  | { kind: 'failed'; result: MailchimpResult }

const WRITABLE_STATUSES = new Set(['subscribed', 'pending'])

/**
 * Creates the member, or leaves an existing one's name and status as they are.
 * The forms calling this are anonymous, so anyone can type anyone's address:
 * an upsert would let them rename a subscriber or change their status. Any
 * record for the address, archived included, counts as existing; a POST alone
 * could re-add an archived contact with the submitted fields. An existing
 * record is `writable` while its status is `subscribed` or `pending`:
 * `pending` is the state these forms create, and the submission that created
 * the member stored a note on it, so a repeat contact message is stored too.
 * Any other status, a lookup whose status cannot be read, and a record that
 * appears between the lookup and the create are `untouched`, so a submission
 * cannot tag or annotate someone who was archived, unsubscribed or cleaned.
 * `writable` and `untouched` get the same success, so a submission that
 * succeeds does not show whether the address has a record or in what state; a
 * rejected create or a failed note write can (see the README). Only a 404
 * lookup leads to a create; any other lookup failure is an error, since the
 * member's state is unknown. The costs: an existing member cannot correct their name through
 * these forms, and a contact message for an `untouched` address is discarded
 * while its sender is told it was sent.
 */
async function addMember(opts: AddMemberOptions): Promise<MemberOutcome> {
  const { audienceId, email, firstName, lastName, status, config } = opts

  const memberId = subscriberHash(email)
  const existing = await makeMailchimpRequest(
    `/lists/${audienceId}/members/${memberId}?fields=id,status`,
    { method: 'GET' },
    config
  )
  if (existing.ok) {
    // An unreadable body must not throw: a failure only existing addresses
    // can cause would tell them apart from new ones.
    const json: unknown = await existing.json().catch(() => ({}))
    const lookup = mailchimpMemberLookupSchema.safeParse(json)
    return lookup.success && WRITABLE_STATUSES.has(lookup.data.status)
      ? { kind: 'writable', memberId }
      : { kind: 'untouched' }
  }
  if (existing.status !== 404) {
    return {
      kind: 'failed',
      result: {
        success: false,
        errorCode: 'api_error',
        error: `Failed to look up member: HTTP ${existing.status}`,
      },
    }
  }

  const memberData: NewMemberPayload = {
    email_address: email,
    status,
    merge_fields: {},
  }
  if (firstName !== undefined) memberData.merge_fields.FNAME = firstName
  if (lastName !== undefined) memberData.merge_fields.LNAME = lastName

  const response = await makeMailchimpRequest(
    `/lists/${audienceId}/members`,
    {
      method: 'POST',
      body: JSON.stringify(memberData),
    },
    config
  )

  if (response.ok) {
    let json: unknown
    try {
      json = await response.json()
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      // A JSON parse error's message can quote the body, here the member
      // record, so it never reaches a log. The cost: the member exists but
      // gets no tag or note, and the visitor is told the submission failed.
      return {
        kind: 'failed',
        result: {
          success: false,
          errorCode: 'api_error',
          error: `Failed to add member: HTTP ${response.status} with an unreadable body`,
        },
      }
    }
    const member = parseApiResponse(
      mailchimpMemberResponseSchema,
      json,
      'Mailchimp members API'
    )
    return { kind: 'writable', memberId: member.id }
  }

  const errorJson: unknown = await response.json().catch(() => ({}))
  const errorData = mailchimpErrorResponseSchema.safeParse(errorJson).data ?? {}

  if (response.status === 400 && errorData.title === 'Member Exists') {
    return { kind: 'untouched' }
  }

  // The forgotten title is matched exactly and checked first: its `detail` is
  // free text that the 'invalid' search below could also match. `detail`
  // quotes the submitted address, which is removed before the search:
  // 'invalid@example.com' is not Mailchimp calling the address invalid.
  const lowerDetail = (errorData.detail ?? '')
    .toLowerCase()
    .replaceAll(email.trim().toLowerCase(), '')
  let errorCode: MailchimpErrorCode = 'api_error'
  if (response.status === 400 && errorData.title === FORGOTTEN_EMAIL_TITLE) {
    errorCode = 'forgotten_email'
  } else if (lowerDetail.includes('fake') || lowerDetail.includes('invalid')) {
    errorCode = 'invalid_email'
  }

  const title = errorData.title
    ? ` ${loggableTitle(errorData.title, email)}`
    : ''
  return {
    kind: 'failed',
    result: {
      success: false,
      errorCode,
      error: `Failed to add member: HTTP ${response.status}${title}`,
    },
  }
}

export async function addContactToMailchimp(
  contactData: ContactData
): Promise<MailchimpResult> {
  let config: MailchimpConfig
  try {
    config = getMailchimpConfig()
  } catch (error) {
    console.error('Mailchimp config error:', describeCause(error))
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

    const member = await addMember({
      audienceId,
      email: contactData.email,
      firstName,
      lastName,
      status: contactData.status ?? 'pending',
      config,
    })

    if (member.kind === 'failed') {
      console.error(
        'Mailchimp contact error:',
        member.result.error || 'Failed to add contact'
      )
      return member.result
    }
    if (member.kind === 'untouched') {
      return { success: true }
    }

    // Tags are optional segmentation.
    try {
      await applyMemberTags(
        audienceId,
        contactData.email,
        ['contact-form'],
        config
      )
    } catch (err) {
      console.error(
        'Mailchimp contact tag error (non-fatal):',
        describeCause(err)
      )
    }

    if (contactData.note) {
      // The note's log lines carry a status or an error name and nothing
      // else: the response body and a thrown message can quote the address
      // or the note.
      let response: Response
      try {
        response = await makeMailchimpRequest(
          `/lists/${audienceId}/members/${member.memberId}/notes`,
          {
            method: 'POST',
            body: JSON.stringify({ note: contactData.note }),
          },
          config
        )
      } catch (error) {
        console.error(
          'Mailchimp contact note error:',
          error instanceof Error ? error.name : 'unknown error'
        )
        return {
          success: false,
          errorCode: 'network_error',
          error: 'Network error occurred',
        }
      }
      const isRefusal =
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      if (isRefusal) {
        // A refused note still answers success: only a writable address is
        // sent a note, so an error here would tell a visitor that the address
        // has not left the list. The cost: the message is lost while its
        // sender is told it was sent, and this line is the only trace.
        console.error(
          'Mailchimp contact note refused:',
          `HTTP ${response.status}`
        )
        return { success: true }
      }
      if (!response.ok) {
        console.error(
          'Mailchimp contact note error:',
          `HTTP ${response.status}`
        )
        return {
          success: false,
          errorCode: 'api_error',
          error: 'Failed to store contact note',
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Mailchimp contact error:', describeCause(error))
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
    console.error('Mailchimp config error:', describeCause(error))
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

    const member = await addMember({
      audienceId,
      email: subscriptionData.email,
      firstName: subscriptionData.firstName,
      lastName: subscriptionData.lastName,
      status: subscriptionData.status ?? 'pending',
      config,
    })

    if (member.kind === 'failed') {
      console.error(
        'Mailchimp subscription error:',
        member.result.error || 'Failed to subscribe'
      )
      return member.result
    }
    if (member.kind === 'untouched') {
      return { success: true }
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
      console.error(
        'Mailchimp newsletter tag error (non-fatal):',
        describeCause(err)
      )
    }

    return { success: true }
  } catch (error) {
    console.error('Mailchimp subscription error:', describeCause(error))
    return {
      success: false,
      errorCode: 'network_error',
      error: 'Network error occurred',
    }
  }
}
