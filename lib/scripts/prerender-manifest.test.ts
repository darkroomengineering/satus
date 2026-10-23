/**
 * `/` must be prerendered at build time as static HTML. Any dynamic read in
 * the homepage's tree (`cookies()`, `headers()`, `searchParams`, a fetch with
 * `cache: 'no-store'`) silently flips the whole route to per-request rendering,
 * and nothing else in CI notices: the build passes either way (see PR #324).
 * This reads `.next/prerender-manifest.json`, written by `bun run build`.
 *
 * Only `/` is asserted: other routes (studio, api, `[slug]`) legitimately
 * render per request, and forks add and remove routes.
 */

import { describe, expect, it } from 'bun:test'

interface PrerenderManifest {
  version: number
  routes: Record<string, { response?: string; compute?: string }>
}

const manifestPath = '.next/prerender-manifest.json'
const manifestFile = Bun.file(manifestPath)
const manifestExists = await manifestFile.exists()

// Skips without a build. ci.yml's build job sets PRERENDER_MANIFEST_REQUIRED,
// so there a missing manifest fails. ci-gate.yml runs check without a build.
describe.skipIf(!manifestExists && !process.env.PRERENDER_MANIFEST_REQUIRED)(
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
