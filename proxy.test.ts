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

import { config as proxyConfig, FILE_EXTENSION, MACHINE_PATHS } from './proxy'
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
  // Every path that must never be treated as a page document, regardless of
  // which mechanism does the excluding: `MACHINE_PATHS` (only load-bearing
  // for paths the other two mechanisms miss), the exported proxy `matcher`
  // (paths that never reach `proxy()` at all), or `FILE_EXTENSION` (dotted
  // last segment). `vercel.json`'s route `src` encodes the same list
  // independently — this test is what keeps a future third machine
  // endpoint from being added to only one of the two configs.
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
