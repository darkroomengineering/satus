/**
 * Unit tests for validation utilities
 *
 * Run with: bun test lib/utils/validation.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
  analyticsEnvSchema,
  coreEnvSchema,
  emailSchema,
  hubspotEnvSchema,
  mailchimpEnvSchema,
  parseFormData,
  phoneSchema,
  sanityEnvSchema,
  shopifyEnvSchema,
  turnstileEnvSchema,
} from './validation'

// ============================================
// Environment Variable Schemas
// ============================================

describe('sanityEnvSchema', () => {
  test('valid config passes', () => {
    const result = sanityEnvSchema.safeParse({
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123',
      NEXT_PUBLIC_SANITY_DATASET: 'production',
    })
    expect(result.success).toBe(true)
  })

  test('missing fields fails', () => {
    const result = sanityEnvSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('empty strings fail', () => {
    const result = sanityEnvSchema.safeParse({
      NEXT_PUBLIC_SANITY_PROJECT_ID: '',
      NEXT_PUBLIC_SANITY_DATASET: '',
    })
    expect(result.success).toBe(false)
  })

  test('partial config fails', () => {
    const result = sanityEnvSchema.safeParse({
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'abc123',
    })
    expect(result.success).toBe(false)
  })
})

describe('shopifyEnvSchema', () => {
  test('valid config passes', () => {
    const result = shopifyEnvSchema.safeParse({
      SHOPIFY_STORE_DOMAIN: 'my-store.myshopify.com',
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'shpat_abc123',
    })
    expect(result.success).toBe(true)
  })

  test('missing fields fails', () => {
    const result = shopifyEnvSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('empty strings fail', () => {
    const result = shopifyEnvSchema.safeParse({
      SHOPIFY_STORE_DOMAIN: '',
      SHOPIFY_STOREFRONT_ACCESS_TOKEN: '',
    })
    expect(result.success).toBe(false)
  })

  test('partial config fails', () => {
    const result = shopifyEnvSchema.safeParse({
      SHOPIFY_STORE_DOMAIN: 'my-store.myshopify.com',
    })
    expect(result.success).toBe(false)
  })
})

describe('hubspotEnvSchema', () => {
  test('valid with access token only', () => {
    const result = hubspotEnvSchema.safeParse({
      HUBSPOT_ACCESS_TOKEN: 'pat-na1-abc123',
    })
    expect(result.success).toBe(true)
  })

  test('valid with portal ID only', () => {
    const result = hubspotEnvSchema.safeParse({
      NEXT_PUBLIC_HUBSPOT_PORTAL_ID: '12345678',
    })
    expect(result.success).toBe(true)
  })

  test('valid with both fields', () => {
    const result = hubspotEnvSchema.safeParse({
      HUBSPOT_ACCESS_TOKEN: 'pat-na1-abc123',
      NEXT_PUBLIC_HUBSPOT_PORTAL_ID: '12345678',
    })
    expect(result.success).toBe(true)
  })

  test('fails with neither field', () => {
    const result = hubspotEnvSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('mailchimpEnvSchema', () => {
  test('valid config passes', () => {
    const result = mailchimpEnvSchema.safeParse({
      MAILCHIMP_API_KEY: 'abc123-us1',
      MAILCHIMP_SERVER_PREFIX: 'us1',
      MAILCHIMP_AUDIENCE_ID: 'list123',
    })
    expect(result.success).toBe(true)
  })

  test('missing any field fails', () => {
    const cases = [
      {
        MAILCHIMP_SERVER_PREFIX: 'us1',
        MAILCHIMP_AUDIENCE_ID: 'list123',
      },
      {
        MAILCHIMP_API_KEY: 'abc123-us1',
        MAILCHIMP_AUDIENCE_ID: 'list123',
      },
      {
        MAILCHIMP_API_KEY: 'abc123-us1',
        MAILCHIMP_SERVER_PREFIX: 'us1',
      },
    ]

    for (const data of cases) {
      const result = mailchimpEnvSchema.safeParse(data)
      expect(result.success).toBe(false)
    }
  })

  test('empty strings fail', () => {
    const result = mailchimpEnvSchema.safeParse({
      MAILCHIMP_API_KEY: '',
      MAILCHIMP_SERVER_PREFIX: '',
      MAILCHIMP_AUDIENCE_ID: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('turnstileEnvSchema', () => {
  test('valid config passes', () => {
    const result = turnstileEnvSchema.safeParse({
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: '0x4AAAAAAAB...',
      CLOUDFLARE_TURNSTILE_SECRET_KEY: '0x4AAAAAAAB...',
    })
    expect(result.success).toBe(true)
  })

  test('missing fields fails', () => {
    const result = turnstileEnvSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('partial config fails', () => {
    const result = turnstileEnvSchema.safeParse({
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: '0x4AAAAAAAB...',
    })
    expect(result.success).toBe(false)
  })

  test('empty strings fail', () => {
    const result = turnstileEnvSchema.safeParse({
      NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: '',
      CLOUDFLARE_TURNSTILE_SECRET_KEY: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('analyticsEnvSchema', () => {
  test('valid with Google Analytics only', () => {
    const result = analyticsEnvSchema.safeParse({
      NEXT_PUBLIC_GOOGLE_ANALYTICS: 'G-XXXXXXXXXX',
    })
    expect(result.success).toBe(true)
  })

  test('valid with GTM only', () => {
    const result = analyticsEnvSchema.safeParse({
      NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: 'GTM-XXXXXXX',
    })
    expect(result.success).toBe(true)
  })

  test('valid with both fields', () => {
    const result = analyticsEnvSchema.safeParse({
      NEXT_PUBLIC_GOOGLE_ANALYTICS: 'G-XXXXXXXXXX',
      NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: 'GTM-XXXXXXX',
    })
    expect(result.success).toBe(true)
  })

  test('fails with neither field', () => {
    const result = analyticsEnvSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('coreEnvSchema', () => {
  test('valid URL passes', () => {
    const result = coreEnvSchema.safeParse({
      NEXT_PUBLIC_BASE_URL: 'https://example.com',
    })
    expect(result.success).toBe(true)
  })

  test('localhost with protocol passes', () => {
    const result = coreEnvSchema.safeParse({
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
    })
    expect(result.success).toBe(true)
  })

  test('invalid URL fails', () => {
    const result = coreEnvSchema.safeParse({
      NEXT_PUBLIC_BASE_URL: 'localhost',
    })
    expect(result.success).toBe(false)
  })

  test('empty string fails', () => {
    const result = coreEnvSchema.safeParse({
      NEXT_PUBLIC_BASE_URL: '',
    })
    expect(result.success).toBe(false)
  })

  test('missing field fails', () => {
    const result = coreEnvSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ============================================
// Field Validators
// ============================================

describe('emailSchema', () => {
  test('valid emails pass', () => {
    const validEmails = [
      'user@example.com',
      'name@domain.co.uk',
      'test+tag@sub.domain.com',
    ]

    for (const email of validEmails) {
      const result = emailSchema.safeParse(email)
      expect(result.success).toBe(true)
    }
  })

  test('invalid emails fail', () => {
    const invalidEmails = [
      '',
      'not-an-email',
      '@missing-local.com',
      'no-at-sign',
    ]

    for (const email of invalidEmails) {
      const result = emailSchema.safeParse(email)
      expect(result.success).toBe(false)
    }
  })
})

describe('phoneSchema', () => {
  test('valid E.164 numbers pass', () => {
    const validPhones = ['+1234567890', '+14155552671', '+442071234567']

    for (const phone of validPhones) {
      const result = phoneSchema.safeParse(phone)
      expect(result.success).toBe(true)
    }
  })

  test('numbers without + prefix are accepted', () => {
    // The schema allows optional + prefix
    const result = phoneSchema.safeParse('1234567890')
    expect(result.success).toBe(true)
  })

  test('invalid phone numbers fail', () => {
    const invalidPhones = ['abc', '', '+0123456789', 'phone: +1234567890', '+']

    for (const phone of invalidPhones) {
      const result = phoneSchema.safeParse(phone)
      expect(result.success).toBe(false)
    }
  })
})

// ============================================
// parseFormData
// ============================================

describe('parseFormData', () => {
  const testSchema = z.object({
    email: z.email(),
    name: z.string().min(1),
  })

  test('valid FormData returns success with typed data', () => {
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('name', 'Alice')

    const result = parseFormData(testSchema, formData)

    expect('success' in result).toBe(true)
    if ('success' in result) {
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('user@example.com')
      expect(result.data.name).toBe('Alice')
    }
  })

  test('invalid FormData returns FormState with status 400', () => {
    const formData = new FormData()
    formData.set('email', 'not-an-email')
    formData.set('name', '')

    const result = parseFormData(testSchema, formData)

    expect('success' in result).toBe(false)
    if (!('success' in result)) {
      expect(result.status).toBe(400)
      expect(result.message).toBe('Validation failed')
      expect(result.fieldErrors).toBeDefined()
      expect(result.fieldErrors?.email).toBeDefined()
      expect(result.fieldErrors?.name).toBeDefined()
    }
  })

  test('missing fields returns fieldErrors for each missing field', () => {
    const formData = new FormData()

    const result = parseFormData(testSchema, formData)

    expect('success' in result).toBe(false)
    if (!('success' in result)) {
      expect(result.status).toBe(400)
      expect(result.fieldErrors).toBeDefined()
    }
  })

  test('extra fields are ignored', () => {
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('name', 'Alice')
    formData.set('extra', 'should be ignored')

    const result = parseFormData(testSchema, formData)

    expect('success' in result).toBe(true)
  })
})
