/**
 * Tests for the useForm hook's name-keyed registration.
 *
 * Renders the real hook through a harness that mirrors how fields/index.tsx
 * consumes `register(name)`: each field row pins its registration props for
 * the row's lifetime (React Compiler provides this stability to the
 * production fields; bun test does not run the compiler) and rows are keyed
 * by name so reorders move DOM nodes instead of repurposing them.
 *
 * Run with: bun test components/ui/form/hook.test.tsx
 */

import { afterEach, describe, expect, test } from 'bun:test'

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useEffect, useState } from 'react'

import type { FormState } from '@/lib/types/form'

import { useForm } from './hook'
import type { UseFormReturn } from './types'

afterEach(cleanup)

const action = async (): Promise<FormState> => ({
  status: 200,
  message: 'ok',
})

type FieldConfig = {
  name: string
  id?: string
  type?: 'text' | 'email' | 'hidden' | 'tel'
  defaultValue?: string
  required?: boolean
}

type Snapshot = { current: UseFormReturn | null }

function FieldRow({
  form,
  field,
}: {
  form: UseFormReturn
  field: FieldConfig
}) {
  // One registration per mounted row — the stability React Compiler gives the
  // production fields. Rows are keyed by name, so a reorder moves the row and
  // its registration instead of re-registering the input.
  const [registered] = useState(() => form.register(field.name))

  return (
    <input
      id={field.id ?? field.name}
      name={field.name}
      type={field.type ?? 'text'}
      defaultValue={field.defaultValue}
      required={field.required ?? true}
      {...registered}
    />
  )
}

function Harness({
  fields,
  onSnapshot,
}: {
  fields: FieldConfig[]
  onSnapshot: (form: UseFormReturn) => void
}) {
  const form = useForm({ action })

  // Expose the hook's return value to assertions after each commit.
  useEffect(() => {
    onSnapshot(form)
  }, [form, onSnapshot])

  return (
    <form>
      {fields.map((field) => (
        <FieldRow key={field.name} form={form} field={field} />
      ))}
    </form>
  )
}

// Same as Harness, but wires `form.onSubmit` onto the <form> so submit-gate
// behavior (Enter key, click) can be exercised end to end.
function SubmitHarness({
  fields,
  onSnapshot,
  formAction,
}: {
  fields: FieldConfig[]
  onSnapshot: (form: UseFormReturn) => void
  formAction: () => Promise<FormState>
}) {
  const form = useForm({ action: formAction })

  useEffect(() => {
    onSnapshot(form)
  }, [form, onSnapshot])

  return (
    <form onSubmit={form.onSubmit}>
      {fields.map((field) => (
        <FieldRow key={field.name} form={form} field={field} />
      ))}
      <button type="submit">Submit</button>
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
      <Harness
        fields={[emailField, nameField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    fireEvent.change(getInput(container, 'email'), {
      target: { value: 'not-an-email' },
    })

    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.errors.email?.message).toBe('Invalid email')
    expect(snapshot.current?.isValid.email).toBe(false)
    expect(snapshot.current?.isActive.email).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)

    rerender(
      <Harness
        fields={[nameField, emailField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

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
    const companyField: FieldConfig = { name: 'company', required: false }

    const { container, rerender } = render(
      <Harness
        fields={[emailField, nameField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
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
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    // company is optional (required: false) — untouched must not read invalid
    expect(snapshot.current?.isValid.company).toBe(true)
    expect(snapshot.current?.errors.company?.state).toBe(false)
    // Siblings keep their state
    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.errors.email?.message).toBe('Invalid email')
    expect(snapshot.current?.isValid.email).toBe(false)
    expect(snapshot.current?.isValid.name).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)

    // Unmount it again
    rerender(
      <Harness
        fields={[emailField, nameField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    expect(container.querySelector('input[name="company"]')).toBeNull()
    expect(snapshot.current?.errors.email?.state).toBe(true)
    expect(snapshot.current?.errors.email?.message).toBe('Invalid email')
    expect(snapshot.current?.isValid.email).toBe(false)
    expect(snapshot.current?.isValid.name).toBe(true)
    expect(snapshot.current?.errors.name?.state).toBe(false)
  })

  test('unmounting a required field removes its isValid/isActive/errors entries', () => {
    // Regression test for issue #400: the ref callback only nulled
    // `inputsRefs.current[name]` on unmount and left the isValid/isActive/
    // errors entries in place forever. `isReady` requires every isValid
    // entry to be true, so a required field that unmounts stays a
    // permanent false in that map even though it no longer exists.
    const snapshot: Snapshot = { current: null }
    const emailField: FieldConfig = { name: 'email', type: 'email' }
    const nameField: FieldConfig = { name: 'name' }
    const conditionalField: FieldConfig = { name: 'conditional' } // required by default

    const { rerender } = render(
      <Harness
        fields={[emailField, conditionalField, nameField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    // Required + untouched — registered as invalid.
    expect(snapshot.current?.isValid.conditional).toBe(false)
    expect('conditional' in (snapshot.current?.isActive ?? {})).toBe(true)
    expect('conditional' in (snapshot.current?.errors ?? {})).toBe(true)

    // Unmount it (tab switch / wizard step / feature flag)
    rerender(
      <Harness
        fields={[emailField, nameField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    expect('conditional' in (snapshot.current?.isValid ?? {})).toBe(false)
    expect('conditional' in (snapshot.current?.isActive ?? {})).toBe(false)
    expect('conditional' in (snapshot.current?.errors ?? {})).toBe(false)
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
        onSnapshot={(f) => {
          snapshot.current = f
        }}
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

describe('useForm submit gate', () => {
  test('optional-untouched form is submittable', () => {
    const snapshot: Snapshot = { current: null }
    const nameField: FieldConfig = { name: 'name' }
    const companyField: FieldConfig = { name: 'company', required: false }

    const { container } = render(
      <SubmitHarness
        fields={[nameField, companyField]}
        formAction={action}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    // Required field untouched — not ready yet.
    expect(snapshot.current?.isReady).toBe(false)

    fireEvent.change(getInput(container, 'name'), {
      target: { value: 'Ada' },
    })

    // company was never touched but is optional — must not block isReady.
    expect(snapshot.current?.isValid.company).toBe(true)
    expect(snapshot.current?.isValid.name).toBe(true)
    expect(snapshot.current?.isReady).toBe(true)
  })

  test('unmounting an untouched required field unwedges isReady', () => {
    // The wedge case from issue #400: a required field that mounts
    // untouched, then gets conditionally unmounted, used to leave the form
    // permanently unsubmittable — its stale `isValid: false` entry never
    // left the map even though the field itself was gone.
    const snapshot: Snapshot = { current: null }
    const nameField: FieldConfig = { name: 'name' }
    const conditionalField: FieldConfig = { name: 'conditional' } // required by default

    const { container, rerender } = render(
      <SubmitHarness
        fields={[nameField, conditionalField]}
        formAction={action}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    fireEvent.change(getInput(container, 'name'), {
      target: { value: 'Ada' },
    })

    // `name` is valid, but the untouched required `conditional` field blocks.
    expect(snapshot.current?.isValid.name).toBe(true)
    expect(snapshot.current?.isValid.conditional).toBe(false)
    expect(snapshot.current?.isReady).toBe(false)

    // Unmount the conditional field (e.g. a wizard step moves on).
    rerender(
      <SubmitHarness
        fields={[nameField]}
        formAction={action}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    expect('conditional' in (snapshot.current?.isValid ?? {})).toBe(false)
    expect(snapshot.current?.isReady).toBe(true)
  })

  test('Enter on invalid form does not call the action', () => {
    const snapshot: Snapshot = { current: null }
    let callCount = 0
    const trackedAction = async (): Promise<FormState> => {
      callCount++
      return { status: 200, message: 'ok' }
    }
    const nameField: FieldConfig = { name: 'name' }

    const { container } = render(
      <SubmitHarness
        fields={[nameField]}
        formAction={trackedAction}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    const formElement = container.querySelector('form')
    if (!formElement) throw new Error('form not found')

    // Required field untouched — form is not ready.
    expect(snapshot.current?.isReady).toBe(false)

    // Enter key submits the form natively — simulate via the submit event.
    fireEvent.submit(formElement)

    expect(callCount).toBe(0)
    expect(snapshot.current?.errors.name?.state).toBe(true)
    expect(snapshot.current?.errors.name?.message).toContain('Invalid')
  })

  test('a second Enter/submit while the first is still pending is a no-op', async () => {
    const snapshot: Snapshot = { current: null }
    let callCount = 0
    let resolveAction: ((state: FormState) => void) | undefined
    const pendingAction = (): Promise<FormState> => {
      callCount++
      return new Promise((resolve) => {
        resolveAction = resolve
      })
    }
    const nameField: FieldConfig = { name: 'name' }

    const { container } = render(
      <SubmitHarness
        fields={[nameField]}
        formAction={pendingAction}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    fireEvent.change(getInput(container, 'name'), {
      target: { value: 'Ada' },
    })

    const formElement = container.querySelector('form')
    if (!formElement) throw new Error('form not found')

    // Dispatch both submits synchronously in the same act() pass — this is
    // the race the ref-based lock in useForm guards against: two submit
    // events in the same tick both read `isPending` as false (it only
    // updates after a render), so only a synchronous ref, not render state,
    // can prevent the second dispatch from reaching formAction.
    act(() => {
      fireEvent.submit(formElement)
      fireEvent.submit(formElement)
    })

    expect(callCount).toBe(1)

    await act(async () => {
      resolveAction?.({ status: 200, message: 'ok' })
    })
  })
})

describe('useForm optional-field revalidation', () => {
  test('clearing an optional validated field stays ready, not wedged invalid', () => {
    const snapshot: Snapshot = { current: null }
    const nameField: FieldConfig = { name: 'name' }
    const emailField: FieldConfig = {
      name: 'email',
      type: 'email',
      required: false,
    }

    const { container } = render(
      <SubmitHarness
        fields={[nameField, emailField]}
        formAction={action}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    fireEvent.change(getInput(container, 'name'), {
      target: { value: 'Ada' },
    })
    fireEvent.change(getInput(container, 'email'), {
      target: { value: 'ada@example.com' },
    })

    expect(snapshot.current?.isValid.email).toBe(true)
    expect(snapshot.current?.isReady).toBe(true)

    // Clear the optional field back out.
    fireEvent.change(getInput(container, 'email'), {
      target: { value: '' },
    })

    expect(snapshot.current?.isValid.email).toBe(true)
    expect(snapshot.current?.errors.email?.state).toBe(false)
    expect(snapshot.current?.isReady).toBe(true)
  })
})

describe('useForm phone/tel validator', () => {
  test('type="tel" engages the phone validator via the type fallback', () => {
    const snapshot: Snapshot = { current: null }
    // Name is deliberately not "phone" — this proves the type-fallback
    // lookup (element.type === 'tel'), not a name/id match, engages it.
    const phoneField: FieldConfig = {
      name: 'contact-number',
      type: 'tel',
      required: false,
    }

    const { container } = render(
      <Harness
        fields={[phoneField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    fireEvent.change(getInput(container, 'contact-number'), {
      target: { value: 'not-a-phone' },
    })
    expect(snapshot.current?.isValid['contact-number']).toBe(false)

    fireEvent.change(getInput(container, 'contact-number'), {
      target: { value: '+14155552671' },
    })
    expect(snapshot.current?.isValid['contact-number']).toBe(true)
  })
})

describe('useForm prefilled required fields', () => {
  test('a required field prefilled with a valid value starts valid (SSR/defaultValue)', () => {
    const snapshot: Snapshot = { current: null }
    const emailField: FieldConfig = {
      name: 'email',
      type: 'email',
      defaultValue: 'ada@example.com',
    }

    render(
      <Harness
        fields={[emailField]}
        onSnapshot={(f) => {
          snapshot.current = f
        }}
      />
    )

    expect(snapshot.current?.isValid.email).toBe(true)
    expect(snapshot.current?.errors.email?.state).toBe(false)
  })
})
