/**
 * Unit tests for HubSpot newsletter action validation schema
 *
 * Tests the Zod schema used by HubspotNewsletterAction in isolation,
 * without requiring Next.js server-side mocks (headers, cookies, etc.).
 *
 * Run with: bun test lib/integrations/hubspot/action.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { emailSchema } from '@/utils/validation'

// Replicate the schema from action.ts to test validation in isolation
const hubspotNewsletterSchema = z.object({
  email: emailSchema,
  formId: z.string().min(1, { error: 'Form ID is required' }),
})

describe('HubSpot newsletter schema', () => {
  test('valid input passes', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: 'test@example.com',
      formId: 'abc-123',
    })
    expect(result.success).toBe(true)
  })

  test('valid input with complex email passes', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: 'name+tag@sub.domain.co.uk',
      formId: 'form-456-def',
    })
    expect(result.success).toBe(true)
  })

  test('missing email fails', () => {
    const result = hubspotNewsletterSchema.safeParse({
      formId: 'abc-123',
    })
    expect(result.success).toBe(false)
  })

  test('invalid email fails', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: 'not-an-email',
      formId: 'abc-123',
    })
    expect(result.success).toBe(false)
  })

  test('empty email fails', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: '',
      formId: 'abc-123',
    })
    expect(result.success).toBe(false)
  })

  test('missing formId fails', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: 'test@example.com',
    })
    expect(result.success).toBe(false)
  })

  test('empty formId fails', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: 'test@example.com',
      formId: '',
    })
    expect(result.success).toBe(false)
  })

  test('both fields missing fails', () => {
    const result = hubspotNewsletterSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('error issues contain path information for invalid email', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: 'bad',
      formId: 'abc',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('email')
    }
  })

  test('error issues contain path information for missing formId', () => {
    const result = hubspotNewsletterSchema.safeParse({
      email: 'test@example.com',
      formId: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('formId')
    }
  })
})
