import { instant } from '@next/playwright'
import { expect, test } from '@playwright/test'

/**
 * Instant navigation is a starter default (#259): the 404 page's "Go Home"
 * link is the one real internal navigation in the app, and its shell must
 * paint immediately from the prefetch cache — no waiting on the network.
 * `instant()` (Next 16.3, `@next/playwright`) enforces that by deferring any
 * dynamic data until the wrapped callback returns, so a regression that
 * de-opts the shell (e.g. a `cookies()` read leaking into a shared layout,
 * or a Suspense boundary moved past the fold) fails this test instead of
 * going unnoticed.
 */

test.describe('instant navigation', () => {
  test('404 -> home shell paints instantly, without waiting on the network', async ({
    page,
  }) => {
    await page.goto('/this-route-does-not-exist-e2e')

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()

    const goHome = page.getByRole('link', { name: /go home/i })

    await instant(page, async () => {
      await goHome.click()

      await expect(page.getByRole('heading', { name: 'Satūs' })).toBeVisible()
    })
  })
})
