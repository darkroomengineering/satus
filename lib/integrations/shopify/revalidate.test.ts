import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'

import { NextRequest } from 'next/server'

const secret = 'route-test-secret'
process.env['SHOPIFY_REVALIDATION_SECRET'] = secret
// Imported after the secret is set: `lib/env` reads it once.
const { revalidate } = await import('./revalidate')

function webhook(
  topic: string,
  options: { headers?: Record<string, string>; body?: string } = {}
) {
  const body = options.body ?? JSON.stringify({ id: Math.random() })
  return new NextRequest('http://localhost/api/revalidate', {
    method: 'POST',
    body,
    headers: {
      'x-shopify-hmac-sha256': createHmac('sha256', secret)
        .update(body)
        .digest('base64'),
      'x-shopify-topic': topic,
      'x-shopify-triggered-at': new Date().toISOString(),
      ...options.headers,
    },
  })
}

async function outcome(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('shopify revalidate route', () => {
  test('a stale signed request gets 200 and does nothing', async () => {
    const old = new Date(Date.now() - 3_600_000).toISOString()
    const { status, body } = await outcome(
      await revalidate(
        webhook('products/update', {
          headers: { 'x-shopify-triggered-at': old },
        })
      )
    )
    expect(status).toBe(200)
    expect(body.data.revalidated).toBe(false)
  })

  test('a bad signature gets 401', async () => {
    const res = await revalidate(
      webhook('products/update', {
        headers: { 'x-shopify-hmac-sha256': 'AAAA' },
      })
    )
    expect(res.status).toBe(401)
  })

  test('a junk topic records nothing: the same body with a real topic is not a duplicate', async () => {
    const body = JSON.stringify({ id: 'same-body' })
    const first = await outcome(
      await revalidate(webhook('junk/topic', { body }))
    )
    expect(first.body.data.revalidated).toBe(false)

    // Outside a Next request `revalidateTag` may throw; reaching it proves the
    // request was not dropped as a duplicate.
    let reachedRevalidate = false
    try {
      const second = await outcome(
        await revalidate(webhook('products/update', { body }))
      )
      reachedRevalidate = second.body.data.revalidated === true
    } catch {
      reachedRevalidate = true
    }
    expect(reachedRevalidate).toBe(true)
  })
})
