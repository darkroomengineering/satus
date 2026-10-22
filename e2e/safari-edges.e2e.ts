import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * Mobile Safari paints its status bar and bottom toolbar from fixed elements
 * at the screen edges. `<Wrapper safariEdges>` mounts two strips for it: each
 * must stay pinned to its edge (fixed, never scrolled away or re-anchored by a
 * transformed ancestor), carry the page's own background color, and never
 * swallow taps. Chromium has no safe-area insets, so `env()` resolves to 0
 * and each strip is 12px tall with 7px off screen.
 */

test.use({ viewport: { width: 390, height: 844 } })

async function measureEdges(page: Page) {
  return page.locator('[data-edge]').evaluateAll((edges) =>
    edges.map((edge) => {
      const style = getComputedStyle(edge)
      const rect = edge.getBoundingClientRect()
      return {
        edge: edge.getAttribute('data-edge'),
        ariaHidden: edge.getAttribute('aria-hidden'),
        position: style.position,
        pointerEvents: style.pointerEvents,
        backgroundColor: style.backgroundColor,
        y: rect.y,
        height: rect.height,
        bottom: rect.bottom,
        x: rect.x,
        width: rect.width,
      }
    })
  )
}

test('safari edge strips stay pinned, page-colored and tap-through on the homepage', async ({
  page,
}, testInfo) => {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('viewport size is not set')

  await page.goto('/')
  await page.waitForLoadState('load')
  await expect(page.locator('[data-edge]')).toHaveCount(2)

  const bodyBackground = await page
    .locator('body')
    .evaluate((body) => getComputedStyle(body).backgroundColor)

  // `<html>` sets `scrollbar-gutter: stable`, so desktop Chromium lays fixed
  // elements out beside an 11px scrollbar gutter (clientWidth still reports
  // the full 390). iOS scrollbars overlay and reserve no gutter.
  const layoutWidth = await page
    .locator('html')
    .evaluate((html) => html.getBoundingClientRect().width)

  const atTop = await measureEdges(page)
  const top = atTop.find((edge) => edge.edge === 'top')
  const bottom = atTop.find((edge) => edge.edge === 'bottom')
  if (!top || !bottom) throw new Error('missing a top or bottom strip')

  for (const edge of atTop) {
    expect(edge.ariaHidden, `${edge.edge} is hidden from AT`).toBe('true')
    expect(edge.position, `${edge.edge} position`).toBe('fixed')
    expect(edge.pointerEvents, `${edge.edge} pointer-events`).toBe('none')
    expect(edge.x, `${edge.edge} starts at the left edge`).toBe(0)
    expect(edge.width, `${edge.edge} spans the viewport`).toBe(layoutWidth)
    // The toolbar takes this color, so it must be the page's own background.
    expect(edge.backgroundColor, `${edge.edge} color`).toBe(bodyBackground)
  }
  expect(top.y).toBe(-7)
  expect(top.height).toBe(12)
  expect(bottom.height).toBe(12)
  expect(bottom.bottom).toBe(viewport.height + 7)

  // A transformed ancestor turns `position: fixed` into positioning against
  // that ancestor, so the strips would scroll with it on a real device.
  const ancestorTransforms = await page
    .locator('[data-edge]')
    .evaluateAll((edges) =>
      edges.flatMap((edge) => {
        const found: string[] = []
        for (let node = edge.parentElement; node; node = node.parentElement) {
          const transform = getComputedStyle(node).transform
          if (transform !== 'none') {
            found.push(`${node.tagName}.${node.className}: ${transform}`)
          }
        }
        return found
      })
    )
  expect(ancestorTransforms).toEqual([])

  // Scroll to the bottom: fixed strips keep the same boxes.
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  )
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 2
      )
    )
    .toBe(true)
  const scrollY = await page.evaluate(() => window.scrollY)
  expect(scrollY, 'the page actually scrolled').toBeGreaterThan(0)
  const atBottom = await measureEdges(page)
  expect(atBottom).toEqual(atTop)

  await testInfo.attach('homepage-with-edges', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })

  // Back at the top, the header stays tappable under the strips: the menu
  // toggle, then (on mobile, behind that toggle) the home link.
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  const banner = page.getByRole('banner')
  const toggle = banner.getByRole('button', { name: 'Open menu' })
  const hitsTarget = (target: ReturnType<typeof banner.getByRole>) =>
    target.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const hit = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2
      )
      return hit !== null && el.contains(hit)
    })
  expect(await hitsTarget(toggle), 'menu toggle receives taps').toBe(true)
  await toggle.click()
  const homeLink = banner.getByRole('link', { name: 'home', exact: true })
  await expect(homeLink).toBeVisible()
  expect(await hitsTarget(homeLink), 'home link receives taps').toBe(true)

  await testInfo.attach('edge-measurements', {
    body: JSON.stringify(
      { viewport, layoutWidth, bodyBackground, scrollY, atTop, atBottom },
      null,
      2
    ),
    contentType: 'application/json',
  })
})

test('a Wrapper without safariEdges renders no strips', async ({ page }) => {
  // `/sanity` uses <Wrapper theme="light"> with no safariEdges prop.
  await page.goto('/sanity')
  await page.waitForLoadState('load')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.locator('[data-edge]')).toHaveCount(0)
})
