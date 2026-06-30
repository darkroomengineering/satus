import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Home page smoke', () => {
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

    await page.goto('/')

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
