import { describe, expect, test } from 'bun:test'

import { emailSchema, zodToValidator } from './validation'

// Which values each schema accepts is covered in validation.test.ts; this is
// the bridge from a schema's parse result to the form hook's boolean.
describe('zodToValidator', () => {
  test('returns whether the value passes the schema', () => {
    const validate = zodToValidator(emailSchema)
    expect(validate('user@example.com')).toBe(true)
    expect(validate('not-an-email')).toBe(false)
    expect(validate('')).toBe(false)
  })
})
