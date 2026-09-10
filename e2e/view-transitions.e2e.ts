import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    transitionRecords: { animations: string[]; finished: boolean }[]
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.transitionRecords = []
    const start = document.startViewTransition.bind(document)
    document.startViewTransition = (...args) => {
      const record = { animations: [] as string[], finished: false }
      window.transitionRecords.push(record)
      const transition = start(...args)
      void transition.ready.then(
        () => {
          record.animations = document
            .getAnimations()
            .flatMap((animation) =>
              animation instanceof CSSAnimation ? [animation.animationName] : []
            )
        },
        () => undefined
      )
      void transition.finished.then(
        () => {
          record.finished = true
        },
        () => undefined
      )
      return transition
    }
  })
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`header navigation settles and honors ${reducedMotion} motion preference`, async ({
    page,
  }) => {
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    await page.emulateMedia({ reducedMotion })
    await page.goto('/this-route-does-not-exist-view-transition')
    await page
      .getByRole('banner')
      .getByRole('link', { name: 'home', exact: true })
      .click()
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Satūs', exact: true })
    ).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.transitionRecords.length > 0 &&
            window.transitionRecords.every((record) => record.finished)
        )
      )
      .toBe(true)
    const animations = await page.evaluate(() =>
      window.transitionRecords.flatMap((record) => record.animations)
    )
    if (reducedMotion === 'reduce') {
      expect(animations).not.toContain('page-fade-in')
      expect(animations).not.toContain('page-fade-out')
    } else {
      expect(animations).toContain('page-fade-in')
      expect(animations).toContain('page-fade-out')
    }
    await page.goBack()
    await expect(
      page.getByRole('heading', { name: '404', exact: true })
    ).toBeVisible()
    const home = page
      .getByRole('banner')
      .getByRole('link', { name: 'home', exact: true })
    await home.click()
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Satūs', exact: true })
    ).toBeVisible()

    // Return again immediately: navigation must remain usable while a prior
    // snapshot animation may still be running, including cached history.
    await page.goBack()
    await home.click()
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Satūs', exact: true })
    ).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.transitionRecords.length > 1 &&
            window.transitionRecords.every((record) => record.finished)
        )
      )
      .toBe(true)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Close menu', exact: true })
    ).toHaveAttribute('aria-expanded', 'true')
    expect(runtimeErrors).toEqual([])
  })
}
