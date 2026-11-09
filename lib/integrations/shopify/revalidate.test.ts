import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'

import type { WorkStore } from 'next/dist/server/app-render/work-async-storage.external'
import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external'
import { NextRequest } from 'next/server'

import { env } from '@/lib/env'

import { TAGS } from './constants'
import { revalidate } from './revalidate'

const SECRET = 'test-webhook-secret'
const originalSecret = env.SHOPIFY_REVALIDATION_SECRET

beforeEach(() => {
  env.SHOPIFY_REVALIDATION_SECRET = SECRET
})

afterEach(() => {
  if (originalSecret === undefined) delete env.SHOPIFY_REVALIDATION_SECRET
  else env.SHOPIFY_REVALIDATION_SECRET = originalSecret
})

function webhook(
  topic: string,
  options: { headers?: Record<string, string>; body?: string } = {}
) {
  const body = options.body ?? JSON.stringify({ id: Math.random() })
  return new NextRequest('http://localhost/api/revalidate', {
    method: 'POST',
    body,
    headers: {
      'x-shopify-hmac-sha256': createHmac('sha256', SECRET)
        .update(body)
        .digest('base64'),
      'x-shopify-topic': topic,
      'x-shopify-triggered-at': new Date().toISOString(),
      ...options.headers,
    },
  })
}

function makeStore(withCache = true) {
  // SAFETY: `revalidateTag` reads only `incrementalCache` (for truthiness),
  // `route`, `cacheLifeProfiles` and `pendingRevalidatedTags` from the store
  // (next/dist/server/web/spec-extension/revalidate.js); the handler reads
  // nothing else from it.
  const store = {
    route: '/api/revalidate',
    incrementalCache: withCache ? {} : undefined,
    cacheLifeProfiles: {},
  } as WorkStore
  return store
}

async function handle(request: NextRequest, store: WorkStore = makeStore()) {
  const response = await workAsyncStorage.run(store, () => revalidate(request))
  const body: { data: { revalidated: boolean } | null; error: string | null } =
    await response.json()
  return { status: response.status, body, tags: store.pendingRevalidatedTags }
}

describe('Shopify revalidate webhook', () => {
  test('a stale signed request gets 200 and revalidates nothing', async () => {
    const old = new Date(Date.now() - 3_600_000).toISOString()
    const result = await handle(
      webhook('products/update', { headers: { 'x-shopify-triggered-at': old } })
    )
    expect(result.status).toBe(200)
    expect(result.body.data?.revalidated).toBe(false)
    expect(result.tags ?? []).toEqual([])
  })

  test('a bad signature gets 401', async () => {
    const result = await handle(
      webhook('products/update', {
        headers: { 'x-shopify-hmac-sha256': 'AAAA' },
      })
    )
    expect(result.status).toBe(401)
  })

  test('a junk topic records nothing: the same signed body with a real topic still revalidates', async () => {
    const body = JSON.stringify({ id: 'same-body' })
    const junk = await handle(webhook('junk/topic', { body }))
    expect(junk.body.data?.revalidated).toBe(false)

    const real = await handle(webhook('products/update', { body }))
    expect(real.body.data?.revalidated).toBe(true)
    expect(real.tags).toHaveLength(1)
    expect(real.tags?.[0]).toMatchObject({ tag: TAGS.products })
  })

  test('a duplicate delivery is skipped', async () => {
    const body = JSON.stringify({ id: 'duplicate' })
    const first = await handle(webhook('products/update', { body }))
    const second = await handle(webhook('products/update', { body }))
    expect(first.body.data?.revalidated).toBe(true)
    expect(second.body.data?.revalidated).toBe(false)
    expect(second.tags ?? []).toEqual([])
  })

  test('a failed revalidation releases its dedupe keys so the retry can succeed', async () => {
    const body = JSON.stringify({ id: 'retry-after-failure' })
    const noCache = () =>
      handle(webhook('products/update', { body }), makeStore(false))
    // Without an incrementalCache, `revalidateTag` throws.
    await expect(noCache()).rejects.toThrow('static generation store missing')
    await expect(noCache()).rejects.toThrow('static generation store missing')
  })
})
