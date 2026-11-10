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
        return noteResult < 400
          ? new Response(null, { status: noteResult })
          : Response.json(
              {
                title: `Note refused for ${contact.email}`,
                detail: `${contact.email} sent a note that cannot be stored: ${contact.note}`,
              },
              { status: noteResult }
            )
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
  expect(errorLog).not.toHaveBeenCalled()
})

const existingMember = (status: string) => () =>
  Response.json({ id: 'x', status })

const memberHash = createHash('md5').update(contact.email).digest('hex')
const memberUrl = `https://us1.api.mailchimp.com/3.0/lists/test-value/members/${memberHash}`
const lookup = {
  url: `${memberUrl}?fields=id,status`,
  method: 'GET',
  body: undefined,
}

test.each(['subscribed', 'pending'])(
  'contacts for a %s member keep its name and store the tag and the note',
  async (status) => {
    const requests = stubRequests({ existing: existingMember(status) })
    expect(
      await addContactToMailchimp({
        ...contact,
        email: '  Ada@Example.com ',
        name: 'Eve Mallory',
      })
    ).toEqual({ success: true })
    expect(requests).toEqual([
      lookup,
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
  }
)

test.each(['subscribed', 'pending'])(
  'subscriptions for a %s member keep its name and store the tag',
  async (status) => {
    const requests = stubRequests({ existing: existingMember(status) })
    expect(
      await addSubscriberToMailchimp({ email: contact.email, firstName: 'Eve' })
    ).toEqual({ success: true })
    expect(requests).toEqual([
      lookup,
      {
        url: `${memberUrl}/tags`,
        method: 'POST',
        body: { tags: [{ name: 'newsletter', status: 'active' }] },
      },
    ])
  }
)

const unwritableLookups = [
  { name: 'an archived member', existing: existingMember('archived') },
  { name: 'an unsubscribed member', existing: existingMember('unsubscribed') },
  { name: 'a cleaned member', existing: existingMember('cleaned') },
  {
    name: 'a transactional member',
    existing: existingMember('transactional'),
  },
  {
    name: 'a member with a status this code does not know',
    existing: existingMember('some-future-status'),
  },
  {
    name: 'a member whose lookup carries no status',
    existing: () => Response.json({ id: 'x' }),
  },
  {
    name: 'a member whose lookup body is not JSON',
    existing: () => new Response('upstream'),
  },
]

test.each(unwritableLookups)(
  '$name gets no write request and the same answer as a new address',
  async ({ existing }) => {
    stubRequests()
    const forNewAddress = [
      await addSubscriberToMailchimp({ email: contact.email }),
      await addContactToMailchimp(contact),
    ]

    const requests = stubRequests({ existing })
    expect([
      await addSubscriberToMailchimp({
        email: '  Ada@Example.com ',
        firstName: 'Eve',
      }),
      await addContactToMailchimp({ ...contact, name: 'Eve Mallory' }),
    ]).toEqual(forNewAddress)
    expect(forNewAddress).toEqual([{ success: true }, { success: true }])
    expect(requests).toEqual([lookup, lookup])
    expect(errorLog).not.toHaveBeenCalled()
  }
)

test('a member that appears between the lookup and the create gets no write request beyond the create', async () => {
  const requests = stubRequests({ member: memberExists })
  expect([
    await addSubscriberToMailchimp({ email: contact.email }),
    await addContactToMailchimp(contact),
  ]).toEqual([{ success: true }, { success: true }])
  expect(writeRequests(requests).map((request) => request.url)).toEqual([
    'https://us1.api.mailchimp.com/3.0/lists/test-value/members',
    'https://us1.api.mailchimp.com/3.0/lists/test-value/members',
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

const complianceState = (quoted: string) =>
  memberError(
    'Member In Compliance State',
    `${quoted} is in a compliance state due to unsubscribe, bounce, or compliance review and cannot be subscribed.`
  )

test.each([
  {
    name: 'an address containing "fake"',
    email: 'fake.person@example.com',
    quoted: 'fake.person@example.com',
  },
  {
    name: 'an address containing "invalid"',
    email: 'invalid@example.com',
    quoted: 'invalid@example.com',
  },
  {
    name: 'an address quoted in another letter case',
    email: ' Fake.Person+Invalid@Example.com ',
    quoted: 'fake.person+invalid@example.com',
  },
])(
  '$name rejected for another reason is not classified invalid_email',
  async ({ email, quoted }) => {
    stubRequests({ member: complianceState(quoted) })
    const expected: MailchimpResult = {
      success: false,
      errorCode: 'api_error',
      error: 'Failed to add member: HTTP 400 Member In Compliance State',
    }
    expect(await addSubscriberToMailchimp({ email })).toEqual(expected)
    expect(await addContactToMailchimp({ ...contact, email })).toEqual(expected)
  }
)

test.each(['fake.person@example.com', 'invalid@example.com'])(
  '%s is still classified invalid_email when Mailchimp rejects it as fake, and succeeds when Mailchimp accepts it',
  async (email) => {
    stubRequests({
      member: memberError(
        'Invalid Resource',
        `${email} looks fake or invalid, please enter a real email address.`
      ),
    })
    const rejected: MailchimpResult = {
      success: false,
      errorCode: 'invalid_email',
      error: 'Failed to add member: HTTP 400 Invalid Resource',
    }
    expect(await addSubscriberToMailchimp({ email })).toEqual(rejected)
    expect(await addContactToMailchimp({ ...contact, email })).toEqual(rejected)

    stubRequests()
    expect(await addSubscriberToMailchimp({ email })).toEqual({ success: true })
    expect(await addContactToMailchimp({ ...contact, email })).toEqual({
      success: true,
    })
  }
)

test.each([
  {
    name: 'Mailchimp refuses to add the member',
    stub: {
      member: memberError(
        'Invalid Resource',
        `${contact.email} looks fake or invalid, please enter a real email address.`
      ),
    },
    logged: 'Failed to add member: HTTP 400 Invalid Resource',
  },
  {
    name: 'the member lookup fails',
    stub: {
      existing: () =>
        Response.json(
          { title: 'Error', detail: `${contact.email} cannot be read.` },
          { status: 500 }
        ),
    },
    logged: 'Failed to look up member: HTTP 500',
  },
])(
  'a contact is logged without the address, the name, the note or the detail when $name',
  async ({ stub, logged }) => {
    stubRequests(stub)
    const result = await addContactToMailchimp(contact)
    expect(result.success).toBe(false)
    expect(errorLog.mock.calls).toEqual([['Mailchimp contact error:', logged]])
    const log = errorLog.mock.calls.flat().map(String).join('\n')
    for (const secret of [
      contact.email,
      'Ada',
      'Lovelace',
      contact.note,
      'looks fake',
      'cannot be read',
    ]) {
      expect(log).not.toContain(secret)
    }
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

test('a member error title that quotes the address is logged without it', async () => {
  stubRequests({
    member: memberError(
      'Unexpected problem with Ada@Example.com today',
      'detail'
    ),
  })
  const expected: MailchimpResult = {
    success: false,
    errorCode: 'api_error',
    error: 'Failed to add member: HTTP 400 unexpected problem with today',
  }
  expect(
    await addSubscriberToMailchimp({ email: ' ada@example.COM ' })
  ).toEqual(expected)
  expect(
    await addContactToMailchimp({ ...contact, email: ' ada@example.COM ' })
  ).toEqual(expected)
  expect(errorLog.mock.calls).toEqual([
    ['Mailchimp subscription error:', expected.error],
    ['Mailchimp contact error:', expected.error],
  ])
})

test('a created member whose response body is not JSON fails with fixed text and no further write', async () => {
  const requests = stubRequests({
    member: () =>
      new Response(`{"id":"member-id","email_address":"${contact.email}"`),
  })
  const expected: MailchimpResult = {
    success: false,
    errorCode: 'api_error',
    error: 'Failed to add member: HTTP 200 with an unreadable body',
  }
  expect(await addSubscriberToMailchimp({ email: contact.email })).toEqual(
    expected
  )
  expect(await addContactToMailchimp(contact)).toEqual(expected)
  expect(errorLog.mock.calls).toEqual([
    ['Mailchimp subscription error:', expected.error],
    ['Mailchimp contact error:', expected.error],
  ])
  expect(writeRequests(requests)).toEqual(createRequests(requests))
})

test.each([400, 404, 422])(
  'a note Mailchimp refuses with HTTP %d is logged by status alone and the contact succeeds',
  async (status) => {
    const requests = stubRequests({ noteResult: status })
    expect(await addContactToMailchimp(contact)).toEqual({ success: true })
    expect(requests.at(-1)?.url.endsWith('/notes')).toBe(true)
    expect(errorLog.mock.calls).toEqual([
      ['Mailchimp contact note refused:', `HTTP ${status}`],
    ])
  }
)

test.each([429, 500, 503])(
  'contacts fail when note storage returns HTTP %d, logged by status alone',
  async (status) => {
    stubRequests({ noteResult: status })
    expect(await addContactToMailchimp(contact)).toEqual({
      success: false,
      errorCode: 'api_error',
      error: 'Failed to store contact note',
    })
    expect(errorLog.mock.calls).toEqual([
      ['Mailchimp contact note error:', `HTTP ${status}`],
    ])
  }
)

test('contacts fail when note storage encounters a network error, logged by error name alone', async () => {
  const cause = new Error(
    `Connection closed while sending ${contact.note} for ${contact.email}`
  )
  cause.name = 'TimeoutError'
  stubRequests({ noteResult: cause })
  expect(await addContactToMailchimp(contact)).toEqual({
    success: false,
    errorCode: 'network_error',
    error: 'Network error occurred',
  })
  expect(errorLog.mock.calls).toEqual([
    ['Mailchimp contact note error:', 'TimeoutError'],
  ])
})

test('tag failures are logged without preventing successful note storage', async () => {
  stubRequests({ tagStatus: 500 })
  expect(await addContactToMailchimp(contact)).toEqual({ success: true })
  expect(errorLog).toHaveBeenCalled()
})
