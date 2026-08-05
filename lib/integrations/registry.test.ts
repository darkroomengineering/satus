/**
 * Unit tests for the integration registry (issue #380).
 *
 * `isConfigured` reads `process.env` fresh on every call (no module-level
 * caching), so these tests mutate `process.env` directly and restore it in
 * a `finally` block — the same pattern used in
 * `lib/integrations/shopify/client.test.ts`.
 */

import { afterEach, describe, expect, test } from 'bun:test'

import { isConfigured } from './registry'

const SANITY_KEYS = [
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'SANITY_STUDIO_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_DATASET',
] as const

const originalValues = new Map<string, string | undefined>(
  SANITY_KEYS.map((key) => [key, process.env[key]])
)

function resetSanityEnv() {
  for (const key of SANITY_KEYS) {
    const original = originalValues.get(key)
    if (original === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = original
    }
  }
}

describe('isConfigured("sanity")', () => {
  afterEach(resetSanityEnv)

  test('true when NEXT_PUBLIC_SANITY_PROJECT_ID + dataset are set', () => {
    delete process.env.SANITY_STUDIO_PROJECT_ID
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'abc123'
    process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'

    expect(isConfigured('sanity')).toBe(true)
  })

  test('true when only the SANITY_STUDIO_PROJECT_ID alias + dataset are set', () => {
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    process.env.SANITY_STUDIO_PROJECT_ID = 'abc123'
    process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'

    expect(isConfigured('sanity')).toBe(true)
  })

  test('false when neither project ID variant is set', () => {
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    delete process.env.SANITY_STUDIO_PROJECT_ID
    process.env.NEXT_PUBLIC_SANITY_DATASET = 'production'

    expect(isConfigured('sanity')).toBe(false)
  })

  test('false when nothing is configured', () => {
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    delete process.env.SANITY_STUDIO_PROJECT_ID
    delete process.env.NEXT_PUBLIC_SANITY_DATASET

    expect(isConfigured('sanity')).toBe(false)
  })
})
