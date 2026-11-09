import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'
import { createHash } from 'node:crypto'

import { env } from '@/lib/env'

import {
  addContactToMailchimp,
  addSubscriberToMailchimp,
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
  member = () => Response.json({ id: 'member-id' }),
}: StubOptions = {}) {
  const requests: RecordedRequest[] = []
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], options?: RequestInit) => {
      const url = String(input)
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
  expect(requests).toEqual([
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
  expect(requests.map((request) => request.method)).toEqual(['POST', 'POST'])
  expect(createRequests(requests)).toHaveLength(1)
})

test('other member errors still fail', async () => {
  stubRequests({
    member: () =>
      Response.json(
        {
          title: 'Forgotten Email Not Subscribed',
          status: 400,
          detail: `${contact.email} was permanently deleted and cannot be re-imported.`,
        },
        { status: 400 }
      ),
  })
  expect(await addSubscriberToMailchimp({ email: contact.email })).toEqual({
    success: false,
    errorCode: 'api_error',
    error: `${contact.email} was permanently deleted and cannot be re-imported.`,
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
