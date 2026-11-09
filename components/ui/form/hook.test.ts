/**
 * Pure tests for the form module: validator resolution (issue #230) and the
 * field and post-submit lifecycle reducers.
 *
 * Validators are looked up by element.name first, then element.id, then
 * element.type — so a field where name !== id still applies a name-keyed
 * validator correctly.
 */

import { describe, expect, test } from 'bun:test'

import { fieldReducer, resolveValidator } from './hook'
import { submitLifecycleReducer } from './index'

const noop = () => true

describe('resolveValidator — name takes priority over id and type', () => {
  test('resolves by name when name matches a registered validator', () => {
    const validatorMap = { email: noop }
    // name="email", id="contact-email", type="text"
    const resolved = resolveValidator(validatorMap, {
      name: 'email',
      id: 'contact-email',
      type: 'text',
    })
    expect(resolved).toBe(noop)
  })

  test('name-keyed validator fires even when id differs from name', () => {
    const emailValidator = (v: string) => v.includes('@')
    const validatorMap = { email: emailValidator }

    const resolved = resolveValidator(validatorMap, {
      name: 'email',
      id: 'contact-email', // different from name
      type: 'text',
    })

    expect(resolved).toBeDefined()
    expect(resolved?.('user@example.com')).toBe(true)
    expect(resolved?.('notanemail')).toBe(false)
  })

  test('falls back to id when name has no matching validator', () => {
    const validatorMap = { 'contact-email': noop }
    const resolved = resolveValidator(validatorMap, {
      name: 'email', // no match
      id: 'contact-email', // match
      type: 'text',
    })
    expect(resolved).toBe(noop)
  })

  test('falls back to type when neither name nor id matches', () => {
    const validatorMap = { email: noop }
    const resolved = resolveValidator(validatorMap, {
      name: 'username', // no match
      id: 'user-id', // no match
      type: 'email', // match
    })
    expect(resolved).toBe(noop)
  })

  test('returns undefined when no validator matches at any level', () => {
    const validatorMap = { email: noop }
    const resolved = resolveValidator(validatorMap, {
      name: 'username',
      id: 'user-input',
      type: 'text',
    })
    expect(resolved).toBeUndefined()
  })

  test('name wins over id even when both are registered', () => {
    const nameValidator = () => true
    const idValidator = () => false
    const validatorMap = {
      email: nameValidator,
      'contact-email': idValidator,
    }
    const resolved = resolveValidator(validatorMap, {
      name: 'email',
      id: 'contact-email',
      type: 'text',
    })
    // name-keyed validator (alwaysTrue) must win over id-keyed (alwaysFalse)
    expect(resolved).toBe(nameValidator)
    expect(resolved?.('anything')).toBe(true)
  })

  test('empty name string does not accidentally match an empty-string key', () => {
    // element.name is '' for unnamed elements. Even if the map happens to hold
    // an '' key, an unnamed element must skip the name lookup entirely.
    const emptyKeyValidator = () => true
    const validatorMap = { '': emptyKeyValidator, text: noop }
    const resolved = resolveValidator(validatorMap, {
      name: '',
      id: '',
      type: 'text',
    })
    // must fall through to the type validator, not match the '' key
    expect(resolved).toBe(noop)
  })
})

describe('fieldReducer', () => {
  const valid = {
    active: true,
    valid: true,
    error: { state: false, message: '' },
  }
  const invalid = {
    active: false,
    valid: false,
    error: { state: false, message: '' },
  }

  test('unregistering an absent field returns the same state object', () => {
    const state = { email: valid }
    expect(fieldReducer(state, { type: 'unregister', name: 'phone' })).toBe(
      state
    )
  })

  test('revealInvalid only touches invalid fields, labelled from the payload', () => {
    const state = { email: invalid, name: valid, phone: invalid }
    const next = fieldReducer(state, {
      type: 'revealInvalid',
      labels: { email: 'contact-email' },
    })

    expect(next.name).toBe(valid)
    expect(next.email?.error).toEqual({
      state: true,
      message: 'Invalid contact-email',
    })
    // No label in the payload falls back to the field name.
    expect(next.phone?.error).toEqual({ state: true, message: 'Invalid phone' })
  })

  test('revealInvalid with no invalid field returns the same state object', () => {
    const state = { name: valid }
    expect(fieldReducer(state, { type: 'revealInvalid', labels: {} })).toBe(
      state
    )
  })
})

describe('submitLifecycleReducer', () => {
  test('an edit while the success state shows dismisses it without a remount', () => {
    const succeeded = { phase: 'succeeded' as const, key: 'a' }
    expect(submitLifecycleReducer(succeeded, { type: 'userEdited' })).toEqual({
      phase: 'dismissed',
      key: 'a',
    })
  })

  test('edits and a late auto-reset outside the success state change nothing', () => {
    const idle = { phase: 'idle' as const, key: 'a' }
    const dismissed = { phase: 'dismissed' as const, key: 'a' }
    expect(submitLifecycleReducer(idle, { type: 'userEdited' })).toBe(idle)
    expect(
      submitLifecycleReducer(dismissed, { type: 'autoReset', key: 'b' })
    ).toBe(dismissed)
  })
})
