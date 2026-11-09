import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'

import { env } from '@/lib/env'

import {
  addContactToMailchimp,
  addSubscriberToMailchimp,
  type MailchimpResult,
} from './mailchimp-client'

const originalFetch = globalThis.fetch
const configKeys = [
  'MAILCHIMP_API_KEY',
  'MAILCHIMP_SERVER_PREFIX',
  'MAILCHIMP_AUDIENCE_ID',
] as const
const originalConfig = configKeys.map((key) => ({
  key,
  parsed: env[key],
  raw: process.env[key],
}))
const contact = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  note: 'Please contact me.',
}
let errorLog: ReturnType<typeof spyOn<typeof console, 'error'>>

beforeEach(() => {
  for (const key of configKeys) {
    env[key] = key === 'MAILCHIMP_SERVER_PREFIX' ? 'us1' : 'test-value'
    process.env[key] = env[key]
  }
  errorLog = spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  globalThis.fetch = originalFetch
  errorLog.mockRestore()
  for (const { key, parsed, raw } of originalConfig) {
    env[key] = parsed
    if (raw === undefined) delete process.env[key]
    else process.env[key] = raw
  }
})

interface StubOptions {
  noteResult?: number | Error
  tagStatus?: number
  existing?: () => Response
  member?: () => Response
}

interface RecordedRequest {
  url: string
  method: string | undefined
  body: unknown
}

const memberExists = () =>
  Response.json(
    {
      title: 'Member Exists',
      status: 400,
      detail: `${contact.email} is already a list member. Use PUT to insert or update list members.`,
    },
    { status: 400 }
  )

function stubRequests({
  noteResult = 200,
  tagStatus = 204,
  existing = () =>
    Response.json({ title: 'Resource Not Found' }, { status: 404 }),
  member = () => Response.json({ id: 'member-id' }),
}: StubOptions = {}) {
  const requests: RecordedRequest[] = []
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], options?: RequestInit) => {
      const url = String(input)
      if (options?.method === 'GET') {
        requests.push({ url, method: 'GET', body: undefined })
        return existing()
      }
      if (typeof options?.body !== 'string') throw new Error('Missing body')
      requests.push({
        url,
        method: options.method,
        body: JSON.parse(options.body),
      })
      if (url.endsWith('/tags')) {
        return new Response(null, { status: tagStatus })
      }
      if (url.endsWith('/notes')) {
        if (noteResult instanceof Error) throw noteResult
        return new Response(null, { status: noteResult })
      }
      return member()
    },
    { preconnect: originalFetch.preconnect }
  )
  return requests
}

function writeRequests(requests: RecordedRequest[]) {
  return requests.filter((request) => request.method !== 'GET')
}

function createRequests(requests: RecordedRequest[]) {
  return requests.filter((request) => request.url.endsWith('/members'))
}

test('email-only subscriptions create the member without a name', async () => {
  const requests = stubRequests()
  expect(await addSubscriberToMailchimp({ email: contact.email })).toEqual({
    success: true,
  })
  expect(createRequests(requests)).toEqual([
    {
      url: 'https://us1.api.mailchimp.com/3.0/lists/test-value/members',
      method: 'POST',
      body: {
        email_address: contact.email,
        status: 'pending',
        merge_fields: {},
      },
    },
  ])
})

test('subscriptions send supplied names, including an explicit empty name', async () => {
  const requests = stubRequests()
  await addSubscriberToMailchimp({
    email: contact.email,
    firstName: 'Ada',
    lastName: '',
  })
  expect(createRequests(requests)[0]?.body).toMatchObject({
    merge_fields: { FNAME: 'Ada', LNAME: '' },
  })
})

test('contacts create the member with their full name and succeed after storing the note', async () => {
  const requests = stubRequests()
  expect(await addContactToMailchimp(contact)).toEqual({ success: true })
  expect(createRequests(requests)[0]).toMatchObject({
    method: 'POST',
    body: { merge_fields: { FNAME: 'Ada', LNAME: 'Lovelace' } },
  })
  expect(requests.map((request) => request.url)).toContain(
    'https://us1.api.mailchimp.com/3.0/lists/test-value/members/member-id/notes'
  )
})

test('contacts for an existing member succeed, keep its name, and still store the note', async () => {
  const requests = stubRequests({ member: memberExists })
  expect(await addContactToMailchimp(contact)).toEqual({ success: true })

  const hash = createHash('md5').update(contact.email).digest('hex')
  const memberUrl = `https://us1.api.mailchimp.com/3.0/lists/test-value/members/${hash}`
  expect(writeRequests(requests)).toEqual([
    {
      url: 'https://us1.api.mailchimp.com/3.0/lists/test-value/members',
      method: 'POST',
      body: {
        email_address: contact.email,
        status: 'pending',
        merge_fields: { FNAME: 'Ada', LNAME: 'Lovelace' },
      },
    },
    {
      url: `${memberUrl}/tags`,
      method: 'POST',
      body: { tags: [{ name: 'contact-form', status: 'active' }] },
    },
    {
      url: `${memberUrl}/notes`,
      method: 'POST',
      body: { note: contact.note },
    },
  ])
})

test('subscriptions for an existing member answer the same as for a new one', async () => {
  const requests = stubRequests({ member: memberExists })
  expect(
    await addSubscriberToMailchimp({ email: contact.email, firstName: 'Eve' })
  ).toEqual({ success: true })
  expect(requests.map((request) => request.method)).toEqual([
    'GET',
    'POST',
    'POST',
  ])
  expect(createRequests(requests)).toHaveLength(1)
})

test('any existing record, archived included, is left alone and never re-created', async () => {
  const requests = stubRequests({
    existing: () => Response.json({ id: 'x', status: 'archived' }),
  })
  const email = '  Ada@Example.com '
  expect(
    await addContactToMailchimp({ ...contact, email, name: 'Eve Mallory' })
  ).toEqual({ success: true })

  const hash = createHash('md5').update('ada@example.com').digest('hex')
  const memberUrl = `https://us1.api.mailchimp.com/3.0/lists/test-value/members/${hash}`
  expect(createRequests(requests)).toHaveLength(0)
  expect(requests.map((request) => request.url)).toEqual([
    `${memberUrl}?fields=id`,
    `${memberUrl}/tags`,
    `${memberUrl}/notes`,
  ])
})

test.each([429, 500, 503])(
  'a %d member lookup fails without creating the member',
  async (status) => {
    const requests = stubRequests({
      existing: () => Response.json({ title: 'Error' }, { status }),
    })
    expect(await addSubscriberToMailchimp({ email: contact.email })).toEqual({
      success: false,
      errorCode: 'api_error',
      error: `Failed to look up member: HTTP ${status}`,
    })
    expect(writeRequests(requests)).toHaveLength(0)
  }
)

const memberError = (title: string, detail: string) => () =>
  Response.json({ title, status: 400, detail }, { status: 400 })

const forgottenMember = memberError(
  'Forgotten Email Not Subscribed',
  `${contact.email} was permanently deleted and cannot be re-imported.`
)

test('a permanently deleted address fails as forgotten_email without tagging or storing the note', async () => {
  const requests = stubRequests({ member: forgottenMember })
  const expected: MailchimpResult = {
    success: false,
    errorCode: 'forgotten_email',
    error: 'Failed to add member: HTTP 400 Forgotten Email Not Subscribed',
  }
  expect(await addSubscriberToMailchimp({ email: contact.email })).toEqual(
    expected
  )
  expect(await addContactToMailchimp(contact)).toEqual(expected)
  expect(writeRequests(requests).map((request) => request.url)).toEqual([
    'https://us1.api.mailchimp.com/3.0/lists/test-value/members',
    'https://us1.api.mailchimp.com/3.0/lists/test-value/members',
  ])
})

test.each([
  {
    name: 'a permanently deleted address',
    member: forgottenMember,
    errorCode: 'forgotten_email',
    title: 'Forgotten Email Not Subscribed',
  },
  {
    name: 'a forgotten title whose detail also says invalid',
    member: memberError(
      'Forgotten Email Not Subscribed',
      `${contact.email} is invalid for import: it was permanently deleted.`
    ),
    errorCode: 'forgotten_email',
    title: 'Forgotten Email Not Subscribed',
  },
  {
    name: 'an invalid address',
    member: memberError(
      'Invalid Resource',
      `${contact.email} looks fake or invalid, please enter a real email address.`
    ),
    errorCode: 'invalid_email',
    title: 'Invalid Resource',
  },
  {
    name: 'an unknown 400 title, even when its detail says permanently deleted',
    member: memberError(
      'Bad Request',
      `${contact.email} was permanently deleted and cannot be re-imported.`
    ),
    errorCode: 'api_error',
    title: 'Bad Request',
  },
])(
  '$name returns $errorCode and keeps the address out of the result and the log',
  async ({ member, errorCode, title }) => {
    stubRequests({ member })
    const results = [
      await addSubscriberToMailchimp({ email: contact.email }),
      await addContactToMailchimp(contact),
    ]
    for (const result of results) {
      expect(result).toEqual({
        success: false,
        errorCode,
        error: `Failed to add member: HTTP 400 ${title}`,
      })
    }
    expect(errorLog).toHaveBeenCalled()
    expect(errorLog.mock.calls.flat().map(String).join('\n')).not.toContain(
      contact.email
    )
  }
)

test('an unknown member error title is cut to 80 characters on one line', async () => {
  const title = 'Unexpected\nupstream text '.repeat(12)
  expect(title).toHaveLength(300)
  stubRequests({ member: memberError(title, 'detail') })
  const result = await addSubscriberToMailchimp({ email: contact.email })
  const prefix = 'Failed to add member: HTTP 400 '
  expect(result.errorCode).toBe('api_error')
  expect(result.error?.startsWith(prefix)).toBe(true)
  expect(result.error).not.toContain('\n')
  expect(result.error?.slice(prefix.length).length).toBeLessThanOrEqual(80)
  expect(result.error?.slice(prefix.length)).toBe(
    title.slice(0, 80).replaceAll('\n', ' ')
  )
})

test('a member error without a title reports only the HTTP status', async () => {
  stubRequests({ member: () => new Response('upstream', { status: 502 }) })
  expect(await addSubscriberToMailchimp({ email: contact.email })).toEqual({
    success: false,
    errorCode: 'api_error',
    error: 'Failed to add member: HTTP 502',
  })
})

test('contacts fail when note storage returns an HTTP error', async () => {
  stubRequests({ noteResult: 500 })
  expect(await addContactToMailchimp(contact)).toMatchObject({
    success: false,
    errorCode: 'api_error',
  })
})

test('contacts fail when note storage encounters a network error', async () => {
  stubRequests({ noteResult: new Error('Connection closed') })
  expect(await addContactToMailchimp(contact)).toMatchObject({
    success: false,
    errorCode: 'network_error',
  })
})

test('tag failures are logged without preventing successful note storage', async () => {
  stubRequests({ tagStatus: 500 })
  expect(await addContactToMailchimp(contact)).toEqual({ success: true })
  expect(errorLog).toHaveBeenCalled()
})
