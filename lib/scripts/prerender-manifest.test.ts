/**
 * PPR (Partial Prerendering) regression invariant
 *
 * `cacheComponents: true` is on globally (`next.config.ts`), so `/` is
 * expected to render as a partially-static shell: static HTML around
 * dynamic holes, generated at build time and served instantly. Any uncached
 * dynamic read anywhere in the homepage's component tree — a bare `fetch`,
 * `cookies()`, `headers()`, an un-cached DB call — silently flips the whole
 * route to fully dynamic. Nothing else in CI catches this: the build
 * succeeds either way, lint and typecheck don't know about rendering mode,
 * and the page still looks correct in a browser. This happened for real in
 * this repo (see PR #324) and was only caught by a human reading build output.
 *
 * `bun run build` writes `.next/prerender-manifest.json`, which records the
 * actual rendering mode Next.js chose per route. This test reads that file
 * so the regression fails CI instead of shipping silently.
 *
 * Only `/` is asserted on. Other routes (studio, api routes) legitimately
 * render in other modes, and forks add/remove routes — asserting on those
 * would make this test fight every fork instead of protecting the one
 * route it exists for.
 */

import { describe, expect, it } from 'bun:test'

interface PrerenderManifest {
  version: number
  routes: Record<string, { renderingMode?: string; experimentalPPR?: boolean }>
}

const manifestPath = '.next/prerender-manifest.json'
const manifestFile = Bun.file(manifestPath)
const manifestExists = await manifestFile.exists()

// No prior `bun run build` (e.g. running `bun test` locally without one) —
// skip quietly rather than failing. CI always builds before `bun run check`
// (which runs this suite), so the assertion is live exactly where it matters.
describe.skipIf(!manifestExists)(
  'prerender manifest (.next/prerender-manifest.json)',
  () => {
    it('homepage ("/") renders PARTIALLY_STATIC', async () => {
      const manifest: PrerenderManifest = await manifestFile.json()
      const homeRoute = manifest.routes['/']

      expect(
        homeRoute,
        'Route "/" is missing from the prerender manifest entirely — the build output shape changed, or the route was removed.'
      ).toBeDefined()

      expect(
        homeRoute?.renderingMode,
        'The homepage lost its static shell — some component in its tree performs an uncached ' +
          "dynamic read; find what changed and either wrap it in 'use cache' or gate it behind a Suspense boundary."
      ).toBe('PARTIALLY_STATIC')
    })

    // Deliberately ≥ 1, not a higher bar: forks strip routes, and the real
    // assertion above already fails if `/` is missing. This only proves the
    // manifest parsed into a non-empty shape at all.
    it('manifest parsed at least one route (sanity check)', async () => {
      const manifest: PrerenderManifest = await manifestFile.json()
      const routeCount = Object.keys(manifest.routes).length

      expect(
        routeCount,
        'The prerender manifest parsed to zero routes — the file format likely changed.'
      ).toBeGreaterThanOrEqual(1)
    })
  }
)
