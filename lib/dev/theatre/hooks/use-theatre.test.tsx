/**
 * `useTheatreObject` hands back an object only for the sheet and key that
 * built it. A sheet or key that changes, or a sheet that disappears, must not
 * leave the previous (already detached) object in place.
 */

import { afterEach, describe, expect, test } from 'bun:test'

import { act, cleanup, render, waitFor } from '@testing-library/react'
import { getProject, type ISheet } from '@theatre/core'

import { useTheatreObject } from './use-theatre'

afterEach(cleanup)

const config = { x: { value: 1 } }

// Without studio loaded, Theatre throws on a project with no saved state.
const state = {
  sheetsById: {},
  definitionVersion: '0.4.0',
  revisionHistory: [],
}

const NONE = 'none'

// Renders the address of the object the hook returned, or `NONE`.
function Harness({
  sheet,
  theatreKey = 'box',
}: {
  sheet: ISheet | undefined
  theatreKey?: string
}) {
  const object = useTheatreObject(sheet, theatreKey, config)
  return object ? `${object.address.sheetId}/${object.address.objectKey}` : NONE
}

describe('useTheatreObject', () => {
  test('drops the object when its sheet goes away or changes', async () => {
    const project = getProject('use-theatre-test', { state })
    const sheetA = project.sheet('a')
    const sheetB = project.sheet('b')

    const view = render(<Harness sheet={sheetA} />)
    await waitFor(() => expect(view.container.textContent).toBe('a/box'))

    await act(async () => {
      view.rerender(<Harness sheet={undefined} />)
    })
    expect(view.container.textContent).toBe(NONE)

    await act(async () => {
      view.rerender(<Harness sheet={sheetB} />)
    })
    await waitFor(() => expect(view.container.textContent).toBe('b/box'))
  })

  test('returns nothing while the new sheet object loads', async () => {
    const project = getProject('use-theatre-test-2', { state })
    const sheetA = project.sheet('a')
    const sheetB = project.sheet('b')

    const view = render(<Harness sheet={sheetA} />)
    await waitFor(() => expect(view.container.textContent).toBe('a/box'))

    // Render synchronously with the new sheet: the effect's import has not
    // resolved yet, so the previous sheet's object must not be returned.
    view.rerender(<Harness sheet={sheetB} />)
    expect(view.container.textContent).toBe(NONE)
    await waitFor(() => expect(view.container.textContent).toBe('b/box'))
  })

  test('returns nothing while the object for a new key loads', async () => {
    const project = getProject('use-theatre-test-3', { state })
    const sheet = project.sheet('a')

    const view = render(<Harness sheet={sheet} />)
    await waitFor(() => expect(view.container.textContent).toBe('a/box'))

    view.rerender(<Harness sheet={sheet} theatreKey="sphere" />)
    expect(view.container.textContent).toBe(NONE)
    await waitFor(() => expect(view.container.textContent).toBe('a/sphere'))
  })
})
