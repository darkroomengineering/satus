/**
 * Tests the Zod schema behind HubspotNewsletterAction in isolation, without
 * Next.js server-side mocks (headers, cookies).
 */

import { describe, expect, test } from 'bun:test'

import { hubspotNewsletterSchema } from './schema'

describe('HubSpot newsletter schema', () => {
  const cases: [string, Record<string, string>, string[]][] = [
    ['missing email', { formId: 'abc-123' }, ['email']],
    ['invalid email', { email: 'not-an-email', formId: 'abc-123' }, ['email']],
    ['empty email', { email: '', formId: 'abc-123' }, ['email']],
    ['missing formId', { email: 'test@example.com' }, ['formId']],
    ['empty formId', { email: 'test@example.com', formId: '' }, ['formId']],
    ['both fields missing', {}, ['email', 'formId']],
  ]

  test.each(cases)(
    '%s fails, with the issue on that field',
    (_name, input, fields) => {
      const result = hubspotNewsletterSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.map((issue) => issue.path.join('.'))
        ).toEqual(fields)
      }
    }
  )
})
