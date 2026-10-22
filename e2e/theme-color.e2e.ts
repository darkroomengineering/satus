import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Mobile Safari and Android Chrome tint the browser chrome from
 * `meta[name="theme-color"]`. It must match the route's theme: a stale value
 * paints a black or red toolbar over a white page. The server renders the
 * dark default, and the global <Theme> rewrites the meta after hydration and
 * on every client navigation.
 */

// `themes.dark.primary` and `themes.light.primary` in lib/styles/colors.ts.
const DARK = 'oklch(0 0 0)'
const LIGHT = 'oklch(1 0 0)'

const themeMeta = (page: Page) => page.locator('meta[name="theme-color"]')

async function observe(page: Page) {
  return {
    url: new URL(page.url()).pathname,
    dataTheme: await page.locator('html').getAttribute('data-theme'),
    metaCount: await themeMeta(page).count(),
    metaContent: await themeMeta(page).first().getAttribute('content'),
  }
}

test('theme-color meta follows the route theme on load and client navigation', async ({
  page,
}, testInfo) => {
  const observed: Awaited<ReturnType<typeof observe>>[] = []

  // `/` renders <Wrapper theme="dark">, matching the server default.
  await page.goto('/')
  await page.waitForLoadState('load')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(themeMeta(page)).toHaveCount(1)
  await expect(themeMeta(page)).toHaveAttribute('content', DARK)
  observed.push(await observe(page))

  // `/sanity` renders <Wrapper theme="light"> (its setup screen when Sanity is
  // unconfigured). The server still sends the dark default, so only the
  // client effect can turn the meta light.
  await page.goto('/sanity')
  await page.waitForLoadState('load')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(themeMeta(page)).toHaveAttribute('content', LIGHT)
  await expect(themeMeta(page)).toHaveCount(1)
  observed.push(await observe(page))

  // Client navigation back through the header's `home` link. Nothing on `/`
  // links to `/sanity`, so only the light-to-dark direction is covered here.
  // The window marker proves no full reload happened, which would re-render
  // the server default and pass for the wrong reason.
  await page.evaluate(() => {
    Object.assign(window, { __themeColorNoReload: true })
  })
  await page
    .getByRole('banner')
    .getByRole('link', { name: 'home', exact: true })
    .click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(themeMeta(page)).toHaveAttribute('content', DARK)
  await expect(themeMeta(page)).toHaveCount(1)
  expect(
    await page.evaluate(() => '__themeColorNoReload' in window),
    'navigation stayed client-side'
  ).toBe(true)
  observed.push(await observe(page))

  await testInfo.attach('theme-color-per-route', {
    body: JSON.stringify(observed, null, 2),
    contentType: 'application/json',
  })
})
