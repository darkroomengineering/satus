import { afterEach, expect, test } from 'bun:test'

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createRef, StrictMode, useEffect, useState } from 'react'
import type { ComponentProps } from 'react'

import { Tabs } from './index'

afterEach(cleanup)

function Panels(props: ComponentProps<typeof Tabs.Panel>) {
  return (
    <Tabs.Root defaultValue="draft">
      <Tabs.List>
        <Tabs.Tab value="draft">Draft</Tabs.Tab>
        <Tabs.Tab value="other">Other</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel {...props} value="draft" />
      <Tabs.Panel value="other">Other content</Tabs.Panel>
    </Tabs.Root>
  )
}

test('ordinary panels discard their contents when the user leaves the tab', async () => {
  const view = render(
    <Panels value="draft">
      <input aria-label="Draft text" />
    </Panels>
  )
  fireEvent.change(view.getByRole('textbox'), { target: { value: 'unsaved' } })
  fireEvent.click(view.getByRole('tab', { name: 'Other' }))
  await waitFor(() => expect(view.queryByLabelText('Draft text')).toBeNull())
  fireEvent.click(view.getByRole('tab', { name: 'Draft' }))
  const input = view.getByRole('textbox')
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected input')
  expect(input.value).toBe('')
})

test('preserved drafts survive tab changes while hidden Effects stop and resume in Strict Mode', async () => {
  let subscriptions = 0
  function Draft() {
    const [text, setText] = useState('')
    useEffect(() => {
      subscriptions++
      return () => {
        subscriptions--
      }
    }, [])
    return (
      <input
        aria-label="Draft text"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    )
  }
  const view = render(
    <StrictMode>
      <Panels value="draft" preserveState>
        <Draft />
      </Panels>
    </StrictMode>
  )
  fireEvent.change(view.getByRole('textbox'), {
    target: { value: 'keep my draft' },
  })
  expect(subscriptions).toBe(1)
  fireEvent.click(view.getByRole('tab', { name: 'Other' }))
  await waitFor(() => expect(subscriptions).toBe(0))
  expect(view.queryByRole('textbox')).toBeNull()
  fireEvent.click(view.getByRole('tab', { name: 'Draft' }))
  await waitFor(() => expect(subscriptions).toBe(1))
  const input = view.getByRole('textbox')
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected input')
  expect(input.value).toBe('keep my draft')
  view.unmount()
  expect(subscriptions).toBe(0)
})

for (const renderMode of ['element', 'function'] as const) {
  test(`preserved panels retain custom ${renderMode} rendering and expose the visible DOM ref`, async () => {
    const ref = createRef<HTMLDivElement>()
    const customRender: ComponentProps<typeof Tabs.Panel>['render'] =
      renderMode === 'element' ? (
        <section data-custom="panel" />
      ) : (
        (props) => <section {...props} data-custom="panel" />
      )
    const view = render(
      <Panels value="draft" preserveState ref={ref} render={customRender}>
        Draft content
      </Panels>
    )
    const panel = view.getByRole('tabpanel')
    expect(panel.tagName).toBe('SECTION')
    expect(panel.getAttribute('data-custom')).toBe('panel')
    expect(panel === ref.current).toBe(true)
    fireEvent.click(view.getByRole('tab', { name: 'Other' }))
    await waitFor(() => expect(ref.current).toBeNull())
    fireEvent.click(view.getByRole('tab', { name: 'Draft' }))
    await waitFor(() => expect(panel === ref.current).toBe(true))
    expect(view.getByRole('tabpanel').textContent).toBe('Draft content')
  })
}
