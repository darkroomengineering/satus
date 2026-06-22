/**
 * Tests for form hook validator resolution (issue #230).
 *
 * Verifies that validators are looked up by element.name first,
 * then element.id, then element.type — so a field where name !== id
 * still applies a name-keyed validator correctly.
 *
 * Run with: bun test components/ui/form/hook.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { resolveValidator } from './hook'

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
