import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

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

function stubRequests(noteResult: number | Error = 200, tagStatus = 204) {
  const bodies: unknown[] = []
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0], options?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/tags')) {
        return new Response(null, { status: tagStatus })
      }
      if (url.endsWith('/notes')) {
        if (noteResult instanceof Error) throw noteResult
        return new Response(null, { status: noteResult })
      }
      if (typeof options?.body !== 'string') throw new Error('Missing body')
      bodies.push(JSON.parse(options.body))
      return Response.json({ id: 'member-id' })
    },
    { preconnect: originalFetch.preconnect }
  )
  return bodies
}

test('email-only subscriptions leave existing names untouched', async () => {
  const bodies = stubRequests()
  expect(await addSubscriberToMailchimp({ email: contact.email })).toEqual({
    success: true,
  })
  expect(bodies[0]).toEqual({
    email_address: contact.email,
    status_if_new: 'pending',
    merge_fields: {},
  })
})

test('subscriptions send supplied names, including an explicit empty name', async () => {
  const bodies = stubRequests()
  await addSubscriberToMailchimp({
    email: contact.email,
    firstName: 'Ada',
    lastName: '',
  })
  expect(bodies[0]).toMatchObject({ merge_fields: { FNAME: 'Ada', LNAME: '' } })
})

test('contacts retain full names and succeed after storing the note', async () => {
  const bodies = stubRequests()
  expect(await addContactToMailchimp(contact)).toEqual({ success: true })
  expect(bodies[0]).toMatchObject({
    merge_fields: { FNAME: 'Ada', LNAME: 'Lovelace' },
  })
})

test('contacts fail when note storage returns an HTTP error', async () => {
  stubRequests(500)
  expect(await addContactToMailchimp(contact)).toMatchObject({
    success: false,
    errorCode: 'api_error',
  })
})

test('contacts fail when note storage encounters a network error', async () => {
  stubRequests(new Error('Connection closed'))
  expect(await addContactToMailchimp(contact)).toMatchObject({
    success: false,
    errorCode: 'network_error',
  })
})

test('tag failures are logged without preventing successful note storage', async () => {
  stubRequests(200, 500)
  expect(await addContactToMailchimp(contact)).toEqual({ success: true })
  expect(errorLog).toHaveBeenCalled()
})
