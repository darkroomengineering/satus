/**
 * Tests for EmbedHubspotForm's default target id (two instances without an
 * explicit `target` must get distinct ids, or the second embed's form
 * injection silently no-ops) and its fallback without a portal id.
 */

import { afterEach, describe, expect, test } from 'bun:test'

import { cleanup, render } from '@testing-library/react'

import { EmbedHubspotForm } from './index'

afterEach(cleanup)

describe('EmbedHubspotForm default target id', () => {
  test('two embeds without target props get distinct wrapper ids', () => {
    const { container } = render(
      <>
        <EmbedHubspotForm formId="form-a" />
        <EmbedHubspotForm formId="form-b" />
      </>
    )

    const wrappers = container.querySelectorAll('[id^="hubspot-form-wrapper"]')
    expect(wrappers.length).toBe(2)

    const ids = Array.from(wrappers).map((el) => el.id)
    expect(new Set(ids).size).toBe(2)
    expect(ids[0]).toBeTruthy()
    expect(ids[1]).toBeTruthy()
  })

  test('an explicit target prop is respected as-is', () => {
    const { container } = render(
      <EmbedHubspotForm formId="form-c" target="my-custom-target" />
    )

    expect(container.querySelector('#my-custom-target')).not.toBeNull()
  })
})

describe('EmbedHubspotForm without a portal id', () => {
  test('shows the fallback message instead of a blank box', () => {
    const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
    delete process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
    try {
      const { container, getByRole } = render(
        <EmbedHubspotForm formId="form-d" />
      )

      expect(getByRole('status').textContent).toContain(
        'This form could not load.'
      )
      expect(container.querySelector('script')).toBeNull()
    } finally {
      if (portalId !== undefined) {
        process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID = portalId
      }
    }
  })
})
