/**
 * The Sanity publish webhook handler (`./revalidate.ts`), tested with real
 * signed requests. E2E runs without credentials, so it never reaches this path.
 *
 * Ways it can fail, written before the tests:
 * 1. Secret unset: it must refuse (503) without reading the body, or anyone
 *    could expire the whole cache.
 * 2. No signature header: must be 401, not a revalidation.
 * 3. Signature made with another secret, or a body changed after signing:
 *    must be 401.
 * 4. A signature header in the wrong format: must be 401, not a 500.
 * 5. A valid publish must call `revalidateTag('sanity', { expire: 0 })`. Another
 *    tag misses pages; a missing `expire: 0` serves one more stale page.
 * 6. A rejected request must not revalidate anything.
 * 7. A valid signature over a body that isn't JSON: must be 400, so Sanity's
 *    retries and 5xx alerts don't fire for bad input, and must not revalidate.
 *
 * `revalidateTag` needs the request store Next sets up around a route handler.
 * The tests run the handler inside that store (Next's own
 * `workAsyncStorage`) and read the tags it queued, instead of mocking
 * `next/cache`. A signed request waits the 3 s `parseBody` sleeps, hence the
 * longer timeouts.
 */

import { afterEach, describe, expect, test } from 'bun:test'

import type { WorkStore } from 'next/dist/server/app-render/work-async-storage.external'
import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external'
import { NextRequest } from 'next/server'

import { env } from '@/lib/env'

import { revalidate } from './revalidate'

const SECRET = 'test-webhook-secret'
const SIGNED_TIMEOUT = 10_000
const originalSecret = env.SANITY_REVALIDATE_SECRET

afterEach(() => {
  if (originalSecret === undefined) {
    delete env.SANITY_REVALIDATE_SECRET
  } else {
    env.SANITY_REVALIDATE_SECRET = originalSecret
  }
})

// Sanity's webhook signature, computed independently of `@sanity/webhook`:
// `t=<ms timestamp>,v1=<base64url HMAC-SHA256 of "<timestamp>.<body>">`.
async function sign(body: string, secret: string): Promise<string> {
  const timestamp = Date.now()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${body}`)
  )
  const base64 = btoa(String.fromCharCode(...new Uint8Array(mac)))
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `t=${timestamp},v1=${base64url}`
}

function webhookRequest(body: string, signature?: string): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (signature !== undefined) {
    headers.set('sanity-webhook-signature', signature)
  }
  return new NextRequest('http://localhost/api/revalidate', {
    method: 'POST',
    headers,
    body,
  })
}

async function handle(request: NextRequest) {
  // SAFETY: `revalidateTag` reads only `incrementalCache` (for truthiness),
  // `route`, `cacheLifeProfiles` and `pendingRevalidatedTags` from the store
  // (next/dist/server/web/spec-extension/revalidate.js); the handler reads
  // nothing else from it.
  const store = {
    route: '/api/revalidate',
    incrementalCache: {},
    cacheLifeProfiles: {},
  } as WorkStore
  const response = await workAsyncStorage.run(store, () => revalidate(request))
  const body: { data: { revalidated: boolean } | null; error: string | null } =
    await response.json()
  return {
    status: response.status,
    body,
    tags: store.pendingRevalidatedTags ?? [],
  }
}

const publishBody = JSON.stringify({ _id: 'homePage', _type: 'homePage' })

describe('Sanity revalidate webhook', () => {
  test('secret unset: 503, nothing revalidated', async () => {
    delete env.SANITY_REVALIDATE_SECRET
    const signature = await sign(publishBody, SECRET)

    const result = await handle(webhookRequest(publishBody, signature))

    expect(result.status).toBe(503)
    expect(result.body.data).toBeNull()
    expect(result.tags).toEqual([])
  })

  test('no signature header: 401, nothing revalidated', async () => {
    env.SANITY_REVALIDATE_SECRET = SECRET

    const result = await handle(webhookRequest(publishBody))

    expect(result.status).toBe(401)
    expect(result.tags).toEqual([])
  })

  test('signed with another secret: 401, nothing revalidated', async () => {
    env.SANITY_REVALIDATE_SECRET = SECRET
    const signature = await sign(publishBody, 'some-other-secret')

    const result = await handle(webhookRequest(publishBody, signature))

    expect(result.status).toBe(401)
    expect(result.tags).toEqual([])
  })

  test('body changed after signing: 401, nothing revalidated', async () => {
    env.SANITY_REVALIDATE_SECRET = SECRET
    const signature = await sign(publishBody, SECRET)
    const tampered = JSON.stringify({ _id: 'other', _type: 'homePage' })

    const result = await handle(webhookRequest(tampered, signature))

    expect(result.status).toBe(401)
    expect(result.tags).toEqual([])
  })

  test('malformed signature header: 401, nothing revalidated', async () => {
    env.SANITY_REVALIDATE_SECRET = SECRET

    const result = await handle(webhookRequest(publishBody, 'not-a-signature'))

    expect(result.status).toBe(401)
    expect(result.tags).toEqual([])
  })

  test(
    'valid signature: expires the sanity tag immediately',
    async () => {
      env.SANITY_REVALIDATE_SECRET = SECRET
      const signature = await sign(publishBody, SECRET)

      const result = await handle(webhookRequest(publishBody, signature))

      expect(result.status).toBe(200)
      expect(result.body.error).toBeNull()
      expect(result.body.data?.revalidated).toBe(true)
      expect(result.tags).toHaveLength(1)
      expect(result.tags[0]).toMatchObject({
        tag: 'sanity',
        profile: { expire: 0 },
      })
    },
    SIGNED_TIMEOUT
  )

  test(
    'valid signature over a body that is not JSON: 400, nothing revalidated',
    async () => {
      env.SANITY_REVALIDATE_SECRET = SECRET
      const body = '{not json'
      const signature = await sign(body, SECRET)

      const result = await handle(webhookRequest(body, signature))

      expect(result.status).toBe(400)
      expect(result.tags).toEqual([])
    },
    SIGNED_TIMEOUT
  )
})
