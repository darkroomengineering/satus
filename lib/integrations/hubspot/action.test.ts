/**
 * Unit tests for HubSpot newsletter action validation schema
 *
 * Tests the Zod schema used by HubspotNewsletterAction in isolation,
 * without requiring Next.js server-side mocks (headers, cookies, etc.).
 *
 * Run with: bun test lib/integrations/hubspot/action.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { hubspotNewsletterSchema } from './schema'

/**
 * Replicates the `HUBSPOT_ALLOWED_FORM_IDS` allowlist check from
 * `HubspotNewsletterAction` in `action.ts` — that module carries the
 * `'use server'` directive so it may only export async functions (same
 * constraint documented in `schema.ts`), so the predicate is copied here to
 * test it in isolation, without requiring Next.js server-side mocks
 * (headers, cookies, etc.), matching this repo's other server-action tests
 * (see `shopify/customer/actions.test.ts`).
 */
function isFormIdAllowed(
  formId: string,
  allowedFormIds: string | undefined
): boolean {
  if (!allowedFormIds) return true
  const allowList = allowedFormIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  return allowList.includes(formId)
}

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

describe('HubSpot form ID allowlist (HUBSPOT_ALLOWED_FORM_IDS)', () => {
  test('unset allowlist passes any formId', () => {
    expect(isFormIdAllowed('any-form-id', undefined)).toBe(true)
  })

  test('empty-string allowlist passes any formId', () => {
    expect(isFormIdAllowed('any-form-id', '')).toBe(true)
  })

  test('formId present in the allowlist passes', () => {
    expect(isFormIdAllowed('form-a', 'form-a,form-b')).toBe(true)
  })

  test('formId not in the allowlist is rejected', () => {
    expect(isFormIdAllowed('form-z', 'form-a,form-b')).toBe(false)
  })

  test('allowlist entries are trimmed before matching', () => {
    expect(isFormIdAllowed('form-a', ' form-a , form-b ')).toBe(true)
  })

  test('single-entry allowlist rejects any other formId', () => {
    expect(isFormIdAllowed('form-b', 'form-a')).toBe(false)
  })
})
