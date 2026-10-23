import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type Request, test } from '@playwright/test'

/**
 * One smoke test per static `app/**\/page.tsx`, discovered at collection
 * time so a new route is covered without anyone remembering to add a test.
 * Dynamic segments need fixtures: give them a bespoke `*.e2e.ts` (see
 * `not-found.e2e.ts`). `OPT_OUT` is for routes that cannot be visited (auth,
 * external service), never for slow or flaky ones; past a few dozen routes,
 * raise `--workers`, shard, or move the axe scan to a nightly run instead.
 */

/** Path (as it will be requested, e.g. `/pricing`) -> reason it's excluded. */
const OPT_OUT: Record<string, string> = {}

const APP_DIR = join(process.cwd(), 'app')

/** Recursively collect every `page.tsx` under `dir`, relative to `dir`. */
function findPageFiles(dir: string, base = dir): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const pages: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      pages.push(...findPageFiles(fullPath, base))
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      pages.push(fullPath.slice(base.length))
    }
  }

  return pages
}

/** `/(site)/(examples)/sanity/page.tsx` -> `/sanity`, or `null` if dynamic. */
function toRoute(relativePagePath: string): string | null {
  // path.join produces `\` separators on Windows; split on both so the
  // sweep derives the same routes on every contributor's machine.
  const segments = relativePagePath
    .split(/[\\/]/)
    .filter((segment) => segment.length > 0 && segment !== 'page.tsx')

  if (segments.some((segment) => segment.includes('['))) return null

  const staticSegments = segments.filter(
    (segment) => !(segment.startsWith('(') && segment.endsWith(')'))
  )

  return staticSegments.length === 0 ? '/' : `/${staticSegments.join('/')}`
}

function discoverRoutes(): string[] {
  if (!existsSync(APP_DIR) || !statSync(APP_DIR).isDirectory()) return []

  const routes = findPageFiles(APP_DIR)
    .map(toRoute)
    .filter((route): route is string => route !== null)

  return [...new Set(routes)].sort()
}

/**
 * Wait for `next/dynamic({ ssr: false })` chunks and fonts before axe runs,
 * or it scans pre- or post-mount markup nondeterministically. Tracks
 * `_next/static/chunks` requests because `networkidle` never settles here
 * (WebGL, Lenis and the HMR socket keep the connection busy).
 */
async function waitForDynamicChunksIdle(
  page: Page,
  { quietMs = 300, timeoutMs = 10_000 } = {}
) {
  const isChunkRequest = (request: Request) =>
    request.url().includes('/_next/static/chunks/')

  let pending = 0
  let lastActivityAt = Date.now()

  const onRequest = (request: Request) => {
    if (!isChunkRequest(request)) return
    pending++
    lastActivityAt = Date.now()
  }
  const onRequestSettled = (request: Request) => {
    if (!isChunkRequest(request)) return
    pending = Math.max(0, pending - 1)
    lastActivityAt = Date.now()
  }

  page.on('request', onRequest)
  page.on('requestfinished', onRequestSettled)
  page.on('requestfailed', onRequestSettled)

  try {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (pending === 0 && Date.now() - lastActivityAt >= quietMs) break
      await page.waitForTimeout(50)
    }
  } finally {
    page.off('request', onRequest)
    page.off('requestfinished', onRequestSettled)
    page.off('requestfailed', onRequestSettled)
  }

  // Fonts affect layout (and therefore what's on-screen for axe's
  // color-contrast checks), and can still be loading after chunks settle.
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

const discoveredRoutes = discoverRoutes()

test.describe('route sweep', () => {
  // A broken glob (wrong base dir, renamed `page.tsx` convention, etc.) must
  // fail loudly, not silently pass an empty suite.
  test('discovers at least one route', () => {
    expect(discoveredRoutes.length).toBeGreaterThan(0)
  })

  for (const route of discoveredRoutes) {
    const optOutReason = OPT_OUT[route]

    test(`${route}: renders, has no console errors, passes a11y${
      optOutReason ? ` (opted out: ${optOutReason})` : ''
    }`, async ({ page }) => {
      test.skip(Boolean(optOutReason), optOutReason)

      const consoleErrors: string[] = []
      const pageErrors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      page.on('pageerror', (error) => {
        pageErrors.push(error.message)
      })

      await page.goto(route)

      await expect(page).toHaveTitle(/.+/)
      await expect(page.locator('body')).toBeVisible()

      expect(consoleErrors).toEqual([])
      expect(pageErrors).toEqual([])

      await waitForDynamicChunksIdle(page)

      // Critical and serious only, so minor third-party findings do not churn
      // the baseline.
      const results = await new AxeBuilder({ page }).analyze()
      const seriousViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      )
      expect(seriousViolations).toEqual([])
    })
  }
})
