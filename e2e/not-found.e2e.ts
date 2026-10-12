import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * The `/ai` route's generic smoke (render, console errors, a11y) is now
 * covered by `e2e/route-sweep.e2e.ts` — it's a static page like any other.
 * This file keeps only what the sweep can't generate: the 404 status and
 * branded view for URLs nothing resolves, which depend on how a streamed
 * response sets its status line, not a copy-pastable smoke.
 */

// One URL per way a page reaches `notFound()`: nothing matches, so the
// `[...slug]` catch-all runs, and a dynamic route whose slug has no document.
// Without Sanity credentials (CI) the article route 404s before fetching;
// with them, the fetch finds nothing. Both paths must end in a real 404.
const UNKNOWN_URLS = [
  '/this-route-does-not-exist-e2e',
  '/articles/this-article-does-not-exist-e2e',
]

for (const url of UNKNOWN_URLS) {
  test(`branded 404 for ${url}: real 404 status, no console errors, a11y`, async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      // Chromium logs "Failed to load resource: ... 404" for any non-2xx
      // document. That line is the status this test asserts, not a bug, so
      // drop it for the document URL only; the same message from any other
      // resource still fails the test.
      if (
        msg.text().startsWith('Failed to load resource') &&
        new URL(msg.location().url).pathname === url
      ) {
        return
      }
      consoleErrors.push(msg.text())
    })

    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    const response = await page.goto(url)

    // A real 404, not a 200 with noindex. This holds only while no
    // `loading.tsx` sits above these pages: a loading file wraps the page in
    // a Suspense boundary, the response starts streaming the fallback with a
    // 200 status, and `notFound()` runs after the status line was sent. A
    // `loading.tsx` in `app/(site)/`, `app/(site)/[...slug]/` or
    // `app/(site)/articles/[slug]/` each turned the matching URL here back
    // into a 200 (checked with curl against `next build && next start`).
    expect(response?.status()).toBe(404)

    // `networkidle` never settles here — the WebGL scene and the dev HMR
    // socket keep the connection busy — so anchor on web assertions instead.
    // Page renders: assert a non-empty document title (auto-waits).
    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('body')).toBeVisible()

    // The noindex meta Next.js injects for a page resolved via notFound(),
    // kept as a second signal next to the status. Scoped to the noindex meta
    // rather than all robots metas: the layout's SEO defaults can emit their
    // own robots tag, and matching the pair trips Playwright's strict mode.
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first()
    ).toBeAttached()

    // Branded not-found copy from components/ui/not-found-view/index.tsx —
    // rendered as sentence-case text nodes ("404" heading, "Page not found"
    // message) that CSS uppercases visually via `text-transform: uppercase`.
    // Assert on the actual DOM text, not the rendered case.
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByText('Page not found')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Agent index' })
    ).toHaveAttribute('href', '/ai')
    await expect(page.getByRole('link', { name: 'llms.txt' })).toHaveAttribute(
      'href',
      '/llms.txt'
    )
    await expect(page.getByRole('link', { name: 'Sitemap' })).toHaveAttribute(
      'href',
      '/sitemap.xml'
    )

    // Apart from the document's own 404 line filtered above, the 404 view
    // logs nothing.
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])

    // Basic a11y: scoped to critical + serious violations only.
    // Minor/moderate issues in third-party assets are excluded to keep
    // the baseline stable; tighten to all violations once the starter is
    // confirmed clean at the full severity level.
    const results = await new AxeBuilder({ page }).analyze()
    const seriousViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )
    expect(seriousViolations).toEqual([])
  })
}
