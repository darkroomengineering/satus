import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const wordOpacities = (page: Page) =>
  page
    .locator('[aria-hidden="true"]', { hasText: 'only cleanup' })
    .locator('[class*="word"]')
    .evaluateAll((words) =>
      words.map((word) => Number(getComputedStyle(word).opacity))
    )

test('homepage outro words reveal across the scroll to the page bottom', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForLoadState('load')

  await expect
    .poll(async () => (await wordOpacities(page)).length)
    .toBeGreaterThan(3)
  expect(new Set(await wordOpacities(page))).toEqual(new Set([0.5]))

  await page.mouse.move(640, 400)
  const samples: number[][] = []
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 60)
    await page.waitForTimeout(150)
    samples.push(await wordOpacities(page))
  }

  const partial = samples.some((opacities) =>
    opacities.some((opacity) => opacity > 0.5 && opacity < 1)
  )
  expect(partial, 'some frame shows a word mid-fade').toBe(true)
  const midway = samples.filter(
    (opacities) =>
      opacities.some((opacity) => opacity < 1) &&
      opacities.some((opacity) => opacity > 0.5)
  )
  expect(
    midway.length,
    'the reveal spans several scroll steps'
  ).toBeGreaterThan(1)
  expect(new Set(samples.at(-1))).toEqual(new Set([1]))

  await testInfo.attach('opacity-samples', {
    body: JSON.stringify(samples),
    contentType: 'application/json',
  })
  await testInfo.attach('outro-revealed', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})
