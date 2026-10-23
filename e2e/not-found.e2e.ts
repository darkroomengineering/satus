import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// The 404 status and view for unresolved URLs; generic smoke is in
// route-sweep.e2e.ts.

// One URL per way a page reaches `notFound()`: nothing matches, so the
// `[...slug]` catch-all runs, and a dynamic route whose slug has no document.
// Either way the article route 404s before fetching: without Sanity
// credentials (CI) it has nothing to read, and with them the slug is missing
// from the published route list. Both paths must end in a real 404.
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

    // A real 404 only while no `loading.tsx` sits above these pages: its
    // Suspense boundary streams a 200 before `notFound()` runs. One in
    // `app/(site)/`, `[...slug]/` or `articles/[slug]/` each turned the URL
    // into a 200 (curl against `next build && next start`).
    expect(response?.status()).toBe(404)

    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('body')).toBeVisible()

    // Scoped to the noindex meta: the layout can emit its own robots tag, and
    // matching both trips Playwright's strict mode.
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first()
    ).toBeAttached()

    // DOM text is sentence case; CSS uppercases it.
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

    // Critical and serious only, so minor third-party findings do not churn
    // the baseline.
    const results = await new AxeBuilder({ page }).analyze()
    const seriousViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    )
    expect(seriousViolations).toEqual([])
  })
}
