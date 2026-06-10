/**
 * Tests for the useForm hook's name-keyed registration.
 *
 * Renders the real hook through a harness that mirrors how fields/index.tsx
 * consumes `register(name)`: registration props are memoized per field name
 * (React Compiler does this for the production fields; bun test does not run
 * the compiler) and inputs are keyed by name so reorders move DOM nodes
 * instead of repurposing them.
 *
 * Run with: bun test components/ui/form/hook.test.tsx
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { useForm } from './hook'
import type { FormState, UseFormReturn } from './types'

afterEach(cleanup)

const action = async (): Promise<FormState> => ({
  status: 200,
  message: 'ok',
})

type FieldConfig = {
  name: string
  id?: string
  type?: 'text' | 'email' | 'hidden'
  defaultValue?: string
  required?: boolean
}

type Snapshot = { current: UseFormReturn | null }

function Harness({
  fields,
  snapshot,
}: {
  fields: FieldConfig[]
  snapshot: Snapshot
}) {
  // Test harness, never compiled: it deliberately writes refs during render
  // to expose the hook's return value and to pin registration-prop identity
  // (the stability the Compiler provides to real fields at build time).
  'use no memo'
  const form = useForm({ action })
  snapshot.current = form

  // Mirror React Compiler's memoization of register() in fields/index.tsx:
  // stable registration props per name keep ref identity stable across
  // re-renders, so reordering does not detach and re-register inputs.
  const registrations = useRef<
    Record<string, ReturnType<UseFormReturn['register']>>
  >({})

  return (
    <form>
      {fields.map((field) => {
        let registered = registrations.current[field.name]
        if (!registered) {
          registered = form.register(field.name)
          registrations.current[field.name] = registered
        }
        return (
          <input
            key={field.name}
            id={field.id ?? field.name}
            name={field.name}
            type={field.type ?? 'text'}
            defaultValue={field.defaultValue}
            required={field.required ?? true}
            ref={registered.ref}
            onChange={registered.onChange}
            onBlur={registered.onBlur}
          />
        )
      })}
    </form>
  )
}

function getInput(container: HTMLElement, name: string): HTMLInputElement {
  const input = container.querySelector(`input[name="${name}"]`)
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`No input named "${name}"`)
  }
  return input
}

describe('useForm registration is keyed by field name', () => {
  test('reordering fields keeps errors bound to the same name', () => {
    const snapshot: Snapshot = { current: null }
    const emailField: FieldConfig = { name: 'email', type: 'email' }
    const nameField: FieldConfig = { name: 'name' }

    const { container, rerender } = render(
      <Harness fields={[emailField, nameField]} snapshot={snapshot} />
    )

    fireEvent.change(getInput(container, 'email'), {
      target: { value: 'not-an-email' },
    })

    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.errors.email?.message).toBe('Invalid email')
    expect(snapshot.current?.isValid.email).toBe(false)
    expect(snapshot.current?.isActive.email).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)

    rerender(<Harness fields={[nameField, emailField]} snapshot={snapshot} />)

    // The DOM order actually swapped...
    const inputs = container.querySelectorAll('input')
    expect(inputs[0]?.getAttribute('name')).toBe('name')
    expect(inputs[1]?.getAttribute('name')).toBe('email')

    // ...but error and validity stay attached to the 'email' name
    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.errors.email?.message).toBe('Invalid email')
    expect(snapshot.current?.isValid.email).toBe(false)
    expect(snapshot.current?.isActive.email).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)
    expect(getInput(container, 'email').value).toBe('not-an-email')

    // Events after the swap still route to the right name
    fireEvent.change(getInput(container, 'name'), {
      target: { value: 'Ada' },
    })
    expect(snapshot.current?.isValid.name).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)
    expect(snapshot.current?.errors.email?.state).toBe(true)
  })

  test('conditional field mount/unmount leaves sibling state alone', () => {
    const snapshot: Snapshot = { current: null }
    const emailField: FieldConfig = { name: 'email', type: 'email' }
    const nameField: FieldConfig = { name: 'name' }
    const companyField: FieldConfig = { name: 'company' }

    const { container, rerender } = render(
      <Harness fields={[emailField, nameField]} snapshot={snapshot} />
    )

    fireEvent.change(getInput(container, 'email'), {
      target: { value: 'not-an-email' },
    })
    fireEvent.change(getInput(container, 'name'), {
      target: { value: 'Ada' },
    })

    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.isValid.name).toBe(true)

    // Mount the conditional field between the two siblings
    rerender(
      <Harness
        fields={[emailField, companyField, nameField]}
        snapshot={snapshot}
      />
    )

    expect(snapshot.current?.isValid.company).toBe(false)
    expect(snapshot.current?.errors.company?.state).toBe(false)
    // Siblings keep their state
    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.errors.email?.message).toBe('Invalid email')
    expect(snapshot.current?.isValid.email).toBe(false)
    expect(snapshot.current?.isValid.name).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)

    // Unmount it again
    rerender(<Harness fields={[emailField, nameField]} snapshot={snapshot} />)

    expect(container.querySelector('input[name="company"]')).toBeNull()
    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.errors.email?.message).toBe('Invalid email')
    expect(snapshot.current?.isValid.email).toBe(false)
    expect(snapshot.current?.isValid.name).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)
  })

  test('only type="hidden" gets the auto-valid treatment', () => {
    const snapshot: Snapshot = { current: null }
    render(
      <Harness
        fields={[
          {
            name: 'token',
            type: 'hidden',
            defaultValue: 'abc',
            required: false,
          },
          { name: 'trap', id: 'hidden', type: 'text' },
        ]}
        snapshot={snapshot}
      />
    )

    // type="hidden" is auto-valid and inactive on registration
    expect(snapshot.current?.isValid.token).toBe(true)
    expect(snapshot.current?.isActive.token).toBe(false)
    expect(snapshot.current?.errors.token?.state).toBe(false)

    // id="hidden" alone must not be (regression for the removed magic string)
    expect(snapshot.current?.isValid.trap).toBe(false)
    expect(snapshot.current?.errors.trap?.state).toBe(false)
  })
})
