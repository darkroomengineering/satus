// Tripwire: dropping the `rate-limit` wiring from proxy.ts silently leaves
// `/api/*` unprotected with no build or runtime error.

import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { NextRequest } from 'next/server'

import { rateLimiters } from '@/lib/utils/rate-limit'

import {
  checkSitePassword,
  config as proxyConfig,
  FILE_EXTENSION,
  isSiteUnlocked,
  MACHINE_PATHS,
  proxy,
} from './proxy'
import vercelConfig from './vercel.json'

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

  // Read guarded by existsSync so a deleted proxy.ts fails these with the
  // regex assertion (empty string, clear message) instead of an ENOENT throw.
  const readProxy = () =>
    existsSync(PROXY_PATH) ? Bun.file(PROXY_PATH).text() : Promise.resolve('')

  it('proxy.ts imports the rate-limit util — deleting/editing this out turns off API rate limiting silently', async () => {
    expect(await readProxy()).toMatch(/from ['"]@\/lib\/utils\/rate-limit['"]/)
  })

  it('proxy.ts actually calls rateLimit(), not just imports it unused', async () => {
    expect(await readProxy()).toMatch(/\brateLimit\s*\(/)
  })
})

// Behaviour, not wiring: the revalidation webhook is exempt from the `/api/*`
// limiter (a bulk publish sends many webhooks from one provider IP), and the
// exemption is exactly that path. Each case uses its own IP because the
// limiter's store is module state shared across the whole test file.
describe('proxy.ts /api limiter scope', () => {
  const overLimit = rateLimiters.relaxed.limit + 1

  const statuses = (path: string, ip: string) =>
    Array.from({ length: overLimit }, () =>
      proxy(
        new NextRequest(`https://example.test${path}`, {
          method: 'POST',
          headers: { 'x-forwarded-for': ip },
        })
      )
    ).map((response) => response.status)

  it('never answers 429 on /api/revalidate', () => {
    expect(statuses('/api/revalidate', '203.0.113.1')).not.toContain(429)
  })

  it('still limits every other /api path, including look-alikes', () => {
    for (const [index, path] of [
      '/api/cart/ensure',
      '/api/revalidate-other',
      '/api/revalidate/extra',
    ].entries()) {
      const result = statuses(path, `203.0.113.${index + 10}`)
      expect(result.at(-1)).toBe(429)
      expect(result.slice(0, -1)).not.toContain(429)
    }
  })
})

describe('Vercel document response headers', () => {
  it('applies the post-render Vary transform only to public page documents', () => {
    expect(vercelConfig.framework).toBe('nextjs')
    expect(vercelConfig.routes).toHaveLength(1)

    const route = vercelConfig.routes[0]
    expect(route).toBeDefined()
    if (!route) throw new Error('vercel.json must define its document route')

    expect(route.methods).toEqual(['GET', 'HEAD'])
    // Vercel route `src` patterns match the whole request path. Anchor the
    // JavaScript equivalent so it cannot retry at a later slash after a
    // leading negative lookahead rejects `/api` or `/_next`.
    const matchesDocumentRoute = new RegExp(`^(?:${route.src})$`)

    expect(
      Object.fromEntries(
        ['/', '/ai', '/about'].map((path) => [
          path,
          matchesDocumentRoute.test(path),
        ])
      )
    ).toEqual({ '/': true, '/ai': true, '/about': true })

    expect(
      Object.fromEntries(
        [
          '/api/x',
          '/_next/x',
          '/agent-content',
          '/llms.txt',
          '/robots.txt',
          '/sitemap.xml',
          '/manifest.webmanifest',
          '/icon.png',
          '/assets/scripts/client.js',
        ].map((path) => [path, matchesDocumentRoute.test(path)])
      )
    ).toEqual({
      '/api/x': false,
      '/_next/x': false,
      '/agent-content': false,
      '/llms.txt': false,
      '/robots.txt': false,
      '/sitemap.xml': false,
      '/manifest.webmanifest': false,
      '/icon.png': false,
      '/assets/scripts/client.js': false,
    })

    expect(route.continue).toBe(true)
    expect(route.transforms).toEqual([
      {
        type: 'response.headers',
        op: 'append',
        target: { key: 'Vary' },
        args: 'Accept',
      },
    ])
  })
})

describe('machine-path parity between proxy.ts and vercel.json', () => {
  // Every path that must never be negotiated as a page document, whichever
  // mechanism excludes it (`MACHINE_PATHS`, the `matcher`, `FILE_EXTENSION`).
  // `vercel.json` encodes the same list independently; this keeps a new
  // machine endpoint from landing in only one of them.
  const machinePaths = [
    ...MACHINE_PATHS,
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/manifest.webmanifest',
  ]

  const routeSrc = vercelConfig.routes[0]?.src
  if (!routeSrc) throw new Error('vercel.json must define its document route')
  const vercelDocumentRoute = new RegExp(`^(?:${routeSrc})$`)
  const proxyMatcher = new RegExp(`^(?:${proxyConfig.matcher[0]})$`)

  it('both configs exclude every known machine path from page-document handling', () => {
    for (const path of machinePaths) {
      const excludedFromProxy =
        !proxyMatcher.test(path) ||
        MACHINE_PATHS.has(path) ||
        FILE_EXTENSION.test(path)
      expect(excludedFromProxy, `proxy.ts must exclude ${path}`).toBe(true)
      expect(
        vercelDocumentRoute.test(path),
        `vercel.json must exclude ${path}`
      ).toBe(false)
    }
  })

  it('MACHINE_PATHS carries no entry the matcher or FILE_EXTENSION already excludes', () => {
    for (const path of MACHINE_PATHS) {
      const alreadyExcluded =
        !proxyMatcher.test(path) || FILE_EXTENSION.test(path)
      expect(
        alreadyExcluded,
        `${path} in MACHINE_PATHS is redundant — already excluded elsewhere`
      ).toBe(false)
    }
  })
})

// Ways the gate can fail: let a wrong or malformed password through; throw on
// a bad header; leave an /api look-alike open; gate the webhooks; let a right
// guess through once an IP is locked out; lock out a visitor for opening the
// prompt or for browsing with the right password; omit `no-store`.
describe('password gate', () => {
  const PASSWORD = 's3cret'
  const basic = (credentials: string) =>
    `Basic ${Buffer.from(credentials).toString('base64')}`
  const gate = (path: string, ip: string, authorization?: string) =>
    checkSitePassword(
      new NextRequest(`https://example.test${path}`, {
        headers: {
          'x-forwarded-for': ip,
          ...(authorization && { authorization }),
        },
      }),
      PASSWORD
    )

  it('accepts the password under any username', () => {
    expect(isSiteUnlocked(basic('user:s3cret'), PASSWORD)).toBe(true)
    expect(isSiteUnlocked(basic(':s3cret'), PASSWORD)).toBe(true)
  })

  it('compares everything after the first colon', () => {
    expect(isSiteUnlocked(basic('u:a:b'), 'a:b')).toBe(true)
    expect(isSiteUnlocked(basic('a:b'), 'a:b')).toBe(false)
  })

  it('rejects a missing, wrong, or malformed header without throwing', () => {
    expect(isSiteUnlocked(null, PASSWORD)).toBe(false)
    expect(isSiteUnlocked(basic('u:wrong!'), PASSWORD)).toBe(false)
    expect(isSiteUnlocked(basic('u:s3cret-longer'), PASSWORD)).toBe(false)
    expect(isSiteUnlocked(basic('u:'), PASSWORD)).toBe(false)
    expect(isSiteUnlocked('Bearer s3cret', PASSWORD)).toBe(false)
    expect(isSiteUnlocked('Basic %%%not-base64', PASSWORD)).toBe(false)
  })

  it('answers an uncached 401 with a Basic prompt', () => {
    const response = gate('/', '198.51.100.1')
    expect(response?.status).toBe(401)
    expect(response?.headers.get('www-authenticate')).toStartWith('Basic ')
    expect(response?.headers.get('cache-control')).toBe('no-store')
  })

  it('lets the right password through', () => {
    expect(gate('/', '198.51.100.2', basic('u:s3cret'))).toBeNull()
  })

  it('leaves only the webhooks open, not their look-alikes', () => {
    for (const path of [
      '/api/revalidate',
      '/api/draft-mode/enable',
      '/api/draft-mode/disable',
    ]) {
      expect(gate(path, '198.51.100.3')).toBeNull()
    }
    for (const path of [
      '/api/revalidate-other',
      '/api/revalidate/extra',
      '/api/draft-mode',
      '/api/cart/ensure',
      '/api/unknown',
    ]) {
      expect(gate(path, '198.51.100.3')?.status).toBe(401)
    }
  })

  it('refuses even the right password once an IP sends too many wrong ones', () => {
    for (let i = 0; i < rateLimiters.strict.limit; i++) {
      expect(gate('/', '198.51.100.4', basic('u:wrong'))?.status).toBe(401)
    }
    const locked = gate('/', '198.51.100.4', basic('u:s3cret'))
    expect(locked?.status).toBe(429)
    expect(locked?.headers.get('cache-control')).toBe('no-store')
    expect(gate('/', '198.51.100.5', basic('u:s3cret'))).toBeNull()
  })

  it('never counts the prompt-opening request or a right password', () => {
    const ip = '198.51.100.6'
    for (let i = 0; i < rateLimiters.strict.limit * 3; i++) {
      expect(gate('/', ip)?.status).toBe(401)
      expect(gate('/', ip, basic('u:s3cret'))).toBeNull()
    }
    expect(gate('/', ip, basic('u:wrong'))?.status).toBe(401)
  })
})
