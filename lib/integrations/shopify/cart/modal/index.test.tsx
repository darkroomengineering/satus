import { afterEach, expect, test } from 'bun:test'

import { cleanup, fireEvent, render } from '@testing-library/react'
import { StrictMode, useState } from 'react'

import { CartContext } from '../cart-store-context'
import { CartModal } from './index'

afterEach(cleanup)

function Drawer({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen)
  return (
    <CartContext
      value={{
        state: { cart: undefined },
        actions: {
          updateCartItem() {
            throw new Error('Empty cart cannot update an item')
          },
          addCartItem() {
            throw new Error('Drawer cannot add an item')
          },
        },
        meta: { totalQuantity: () => 0 },
      }}
    >
      <CartModal isOpen={isOpen} closeCart={() => setIsOpen(false)}>
        <button type="button" onClick={() => setIsOpen(true)}>
          Open cart
        </button>
      </CartModal>
    </CartContext>
  )
}

test('opening focuses the drawer contents and Escape returns focus to its trigger', () => {
  const view = render(
    <StrictMode>
      <Drawer />
    </StrictMode>
  )
  const trigger = view.getByRole('button', { name: 'Open cart' })
  trigger.focus()
  fireEvent.click(trigger)
  expect(document.activeElement).toBe(
    view.getByRole('button', { name: /^close$/ })
  )
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(document.activeElement).toBe(trigger)
})

test('an initially open drawer restores prior focus after Strict Mode replays its Effects', () => {
  const trigger = document.createElement('button')
  document.body.append(trigger)
  trigger.focus()
  try {
    const view = render(
      <StrictMode>
        <Drawer initiallyOpen />
      </StrictMode>
    )
    const close = view.getByRole('button', { name: /^close$/ })
    expect(document.activeElement).toBe(close)
    fireEvent.click(close)
    expect(document.activeElement).toBe(trigger)
  } finally {
    trigger.remove()
  }
})
