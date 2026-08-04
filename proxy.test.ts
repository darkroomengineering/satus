/**
 * Tripwire: fails loudly if `proxy.ts` stops wiring up rate limiting.
 *
 * `proxy.ts` is how Next.js rate-limits API routes. Deleting it, or editing
 * it down to drop the `rate-limit` import, silently turns rate limiting off
 * — no build error, no runtime error, just an unprotected `/api/*`. This
 * test is deliberately dumb and grep-like: it doesn't exercise request
 * behavior, it just asserts the wiring is still there.
 *
 * Run with: bun test proxy.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = import.meta.dir
const PROXY_PATH = join(ROOT, 'proxy.ts')
const RATE_LIMIT_PATH = join(ROOT, 'lib/utils/rate-limit.ts')

describe('proxy.ts rate-limit wiring', () => {
  it('proxy.ts exists at the repo root', () => {
    expect(existsSync(PROXY_PATH)).toBe(true)
  })

  it('lib/utils/rate-limit.ts exists', () => {
    expect(existsSync(RATE_LIMIT_PATH)).toBe(true)
  })

  it('proxy.ts imports the rate-limit util — deleting/editing this out turns off API rate limiting silently', async () => {
    const source = await Bun.file(PROXY_PATH).text()
    expect(source).toMatch(/from ['"]@\/lib\/utils\/rate-limit['"]/)
  })

  it('proxy.ts actually calls rateLimit(), not just imports it unused', async () => {
    const source = await Bun.file(PROXY_PATH).text()
    expect(source).toMatch(/\brateLimit\s*\(/)
  })
})
