/**
 * Tests for EmbedHubspotForm's default target id: two instances without an
 * explicit `target` must get distinct ids, or the second embed's form
 * injection silently no-ops.
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
