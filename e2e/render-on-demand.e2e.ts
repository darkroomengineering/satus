import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

/**
 * The root canvas draws only while something keeps it awake: a spinning cube
 * on screen holds it, a scroll that moves a mesh wakes it for a 2 s grace,
 * and otherwise it sleeps and spends no GPU time. A frame is counted as one
 * `gl.clear`, not a draw call: with every mesh hidden an awake frame still
 * clears but draws nothing, so draw calls would read a busy canvas as idle.
 *
 * The canvas mounts only on a hardware WebGL2 context. CI's headless
 * Chromium renders with SwiftShader, where `isWebGL` is false and no canvas
 * mounts, so the test skips there instead of failing. Run it on the GPU with
 * `E2E_GPU=1 bun run test:e2e e2e/render-on-demand.e2e.ts`.
 */

declare global {
  interface Window {
    __clears: number
  }
}

// Desktop width so the canvas mounts (breakpoint 800px); short height so a
// scroll position exists with no cube on screen.
test.use({ viewport: { width: 1440, height: 500 } })

// `wake()` keeps the canvas drawing for 2 s; wait past it before asserting
// the canvas has gone back to sleep.
const GRACE_EXPIRED_MS = 3000

// Parallax moves one box by up to 240px; keep that much clear around a gap.
const BOX_MARGIN = 260

const clears = (page: Page) => page.evaluate(() => window.__clears)

async function framesOver(page: Page, ms: number) {
  const before = await clears(page)
  await page.waitForTimeout(ms)
  return (await clears(page)) - before
}

test('the root canvas draws while a cube is on screen or the page scrolls, and sleeps otherwise', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.__clears = 0
    for (const Context of [
      globalThis.WebGL2RenderingContext,
      globalThis.WebGLRenderingContext,
    ]) {
      if (!Context) continue
      const clear = Context.prototype.clear
      Context.prototype.clear = function (mask: number) {
        window.__clears++
        clear.call(this, mask)
      }
    }
  })

  await page.goto('/webgl')
  await page.waitForLoadState('load')

  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return null
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  })
  test.skip(
    renderer === null || /swiftshader|llvmpipe/i.test(renderer),
    `software or missing WebGL2 (${renderer ?? 'no context'}): isWebGL is false, the root canvas never mounts`
  )

  const canvasMounted = await page
    .waitForFunction(() => document.querySelector('canvas') !== null, null, {
      timeout: 15_000,
    })
    .then(
      () => true,
      () => false
    )
  test.skip(
    !canvasMounted,
    `no <canvas> mounted on /webgl (renderer: ${renderer}); the WebGL gate kept it off`
  )

  // 1. The first cube is in the first screen and holds the canvas awake.
  await expect.poll(() => clears(page)).toBeGreaterThan(0)
  await page.waitForTimeout(1000)
  const cubeOnScreen = await framesOver(page, 1000)
  expect(
    cubeOnScreen,
    'frames per second with a cube on screen'
  ).toBeGreaterThan(30)

  // Find a scroll position, with room for one more wheel step, where no
  // dashed cube box is anywhere near the viewport.
  const layout = await page.evaluate((margin) => {
    const height = window.innerHeight
    const boxes = [...document.querySelectorAll('.outline-dashed')].map(
      (box) => {
        const rect = box.getBoundingClientRect()
        return {
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY,
        }
      }
    )
    const max = document.documentElement.scrollHeight - height
    for (let y = 0; y <= max; y += 20) {
      // The wheel step in phase 3 scrolls 120px further.
      const end = y + height + 160
      if (
        boxes.every((box) => box.bottom + margin < y || box.top - margin > end)
      ) {
        return { gapY: y, boxes, max }
      }
    }
    return { gapY: null, boxes, max }
  }, BOX_MARGIN)
  const { gapY } = layout
  if (gapY === null) {
    throw new Error(
      `no scroll position on /webgl keeps every cube off screen: ${JSON.stringify(layout)}`
    )
  }

  // 2. Cubes off screen: once the scroll's grace runs out, nothing draws.
  await page.evaluate((y) => window.scrollTo(0, y), gapY)
  await page.mouse.move(720, 250)
  await page.mouse.wheel(0, 1)
  await page.waitForTimeout(GRACE_EXPIRED_MS)
  const idleOffScreen = await framesOver(page, 1500)
  expect(idleOffScreen, 'frames while idle with every cube off screen').toBe(0)

  // 3. A scroll moves the off-screen meshes, which wakes the canvas, and it
  // falls back asleep after the grace. `window.lenis` holds only Lenis's
  // version info, not the instance, so scroll through the wheel.
  const scrollBefore = await page.evaluate(() => window.scrollY)
  const beforeWheel = await clears(page)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(800)
  const duringScroll = (await clears(page)) - beforeWheel
  const scrollAfter = await page.evaluate(() => window.scrollY)
  expect(scrollAfter, 'the wheel scrolled the page').toBeGreaterThan(
    scrollBefore
  )
  expect(duringScroll, 'frames during the scroll').toBeGreaterThan(0)
  await page.waitForTimeout(GRACE_EXPIRED_MS)
  const idleAfterScroll = await framesOver(page, 1500)
  expect(idleAfterScroll, 'frames once the scroll has settled').toBe(0)

  // 4. Back to the first cube. Measured after the scroll's own grace, so
  // only the cube's hold can keep frames coming.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.mouse.wheel(0, -1)
  await page.waitForTimeout(GRACE_EXPIRED_MS)
  const cubeBackOnScreen = await framesOver(page, 1000)
  expect(
    cubeBackOnScreen,
    'frames per second with the cube back on screen'
  ).toBeGreaterThan(30)

  await testInfo.attach('render-on-demand-frames', {
    body: JSON.stringify(
      {
        renderer,
        gapY,
        scrollBefore,
        scrollAfter,
        frames: {
          cubeOnScreen_1000ms: cubeOnScreen,
          idleOffScreen_1500ms: idleOffScreen,
          duringScroll_800ms: duringScroll,
          idleAfterScroll_1500ms: idleAfterScroll,
          cubeBackOnScreen_1000ms: cubeBackOnScreen,
        },
      },
      null,
      2
    ),
    contentType: 'application/json',
  })
})
