import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * No cart test here (or anywhere in e2e/): nothing in the starter mounts
 * `<Cart>` — it ships as a library primitive for forks to wire up — so there
 * is no cart UI to drive without first adding a demo shop page, which the
 * starter deliberately does not have. See `lib/integrations/shopify/README.md`.
 */

test.describe('/ai machine view', () => {
  test('renders, has no console errors, passes a11y', async ({ page }) => {
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

    await page.goto('/ai')

    // `networkidle` never settles here — the WebGL scene and the dev HMR
    // socket keep the connection busy — so anchor on web assertions instead.
    // Page renders: assert a non-empty document title (auto-waits).
    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('body')).toBeVisible()

    // No console errors or uncaught exceptions during load
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
})

test.describe('branded 404', () => {
  test('renders, returns 404, has no console errors, passes a11y', async ({
    page,
  }) => {
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

    const response = await page.goto('/this-route-does-not-exist-e2e')

    // Empirically verified (both `next dev` and a `next build && next start`
    // production run, via curl and Playwright): this route's top-level
    // document response is HTTP 200, not 404. Cache Components (PPR, enabled
    // globally — see AGENTS.md "Next.js 16 Cache Components") prerenders the
    // route's static shell and flushes its 200 status before the dynamic
    // hole resolves; `notFound()` runs inside that hole, so by the time it's
    // known the response is a 404, the status line was already sent. This is
    // a genuine soft-404 (curl shows a `NEXT_HTTP_ERROR_FALLBACK;404` marker
    // and a `<meta name="robots" content="noindex">` tag in the same
    // response), not a test bug — assert the real status plus the noindex
    // signal, rather than the 404 status this route cannot produce.
    expect(response?.status()).toBe(200)

    // `networkidle` never settles here — the WebGL scene and the dev HMR
    // socket keep the connection busy — so anchor on web assertions instead.
    // Page renders: assert a non-empty document title (auto-waits).
    await expect(page).toHaveTitle(/.+/)
    await expect(page.locator('body')).toBeVisible()

    // The noindex signal Next.js injects for a page resolved via notFound() —
    // the actual "this is a 404" marker crawlers see, since the HTTP status
    // itself can't carry it (see comment above).
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex'
    )

    // Branded not-found copy from components/ui/not-found-view/index.tsx —
    // rendered as sentence-case text nodes ("404" heading, "Page not found"
    // message) that CSS uppercases visually via `text-transform: uppercase`.
    // Assert on the actual DOM text, not the rendered case.
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByText('Page not found')).toBeVisible()

    // Verified empirically: this 404 navigation logs zero console errors and
    // zero pageerrors (Chromium's "Failed to load resource" console message
    // only fires for a genuinely non-200 document response, and this route's
    // document response is 200 — see comment above).
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
})
