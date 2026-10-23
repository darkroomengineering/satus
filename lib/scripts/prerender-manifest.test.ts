/**
 * Static homepage regression invariant
 *
 * `/` is expected to be prerendered at build time as complete static HTML,
 * served without any per-request rendering. Any dynamic read anywhere in the
 * homepage's component tree (`cookies()`, `headers()`, `searchParams`, a
 * fetch with `cache: 'no-store'`) silently flips the whole route to
 * server-rendered on every request. Nothing else in CI catches this: the
 * build succeeds either way, lint and typecheck don't know about rendering
 * mode, and the page still looks correct in a browser. This happened for real
 * in this repo (see PR #324) and was only caught by a human reading build
 * output.
 *
 * `bun run build` writes `.next/prerender-manifest.json`, which lists every
 * route Next prerendered and how. This test reads that file so the
 * regression fails CI instead of shipping silently.
 *
 * Only `/` is asserted on. Other routes (studio, api routes, `[slug]` pages)
 * legitimately render per request, and forks add/remove routes — asserting
 * on those would make this test fight every fork instead of protecting the
 * one route it exists for.
 */

import { describe, expect, it } from 'bun:test'

interface PrerenderManifest {
  version: number
  routes: Record<string, { response?: string; compute?: string }>
}

const manifestPath = '.next/prerender-manifest.json'
const manifestFile = Bun.file(manifestPath)
const manifestExists = await manifestFile.exists()

// Skips locally without a build. CI builds before `bun run check`, so there a
// missing manifest fails instead of skipping.
describe.skipIf(!manifestExists && !process.env.CI)(
  'prerender manifest (.next/prerender-manifest.json)',
  () => {
    it('homepage ("/") is prerendered as complete static HTML', async () => {
      const manifest: PrerenderManifest = await manifestFile.json()
      const homeRoute = manifest.routes['/']

      expect(
        homeRoute,
        'Route "/" is missing from the prerender manifest: the homepage now renders per request (some component in its tree reads request data), or the build output shape changed.'
      ).toBeDefined()

      expect(
        { response: homeRoute?.response, compute: homeRoute?.compute },
        'The homepage is no longer fully static. Find the request-time read that changed and move it out of the homepage tree.'
      ).toEqual({ response: 'complete', compute: 'static' })
    })
  }
)
