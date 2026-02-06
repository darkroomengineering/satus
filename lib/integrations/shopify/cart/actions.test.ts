/**
 * Unit tests for Shopify cart action validation schemas
 *
 * Tests the addItem and updateQuantity Zod schemas in isolation,
 * without requiring Next.js server-side mocks (headers, cookies, etc.).
 *
 * Run with: bun test lib/integrations/shopify/cart/actions.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { z } from 'zod'

// Replicate schemas from actions.ts to test validation in isolation
const addItemSchema = z.object({
  variantId: z.string().min(1, { error: 'Product variant ID is required' }),
  quantity: z.number().int().min(1).max(99).optional().default(1),
})

const updateQuantitySchema = z.object({
  merchandiseId: z.string().min(1, { error: 'Merchandise ID is required' }),
  quantity: z.number().int().min(0).max(99),
})

// ============================================
// addItem schema
// ============================================

describe('addItem schema', () => {
  test('valid input with quantity', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: 2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(2)
    }
  })

  test('valid input defaults quantity to 1', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(1)
    }
  })

  test('quantity of 1 is valid (minimum)', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: 1,
    })
    expect(result.success).toBe(true)
  })

  test('quantity of 99 is valid (maximum)', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: 99,
    })
    expect(result.success).toBe(true)
  })

  test('empty variantId fails', () => {
    const result = addItemSchema.safeParse({ variantId: '' })
    expect(result.success).toBe(false)
  })

  test('missing variantId fails', () => {
    const result = addItemSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('quantity of 0 fails (minimum is 1 for addItem)', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  test('quantity over 99 fails', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: 100,
    })
    expect(result.success).toBe(false)
  })

  test('negative quantity fails', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: -1,
    })
    expect(result.success).toBe(false)
  })

  test('non-integer quantity fails', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: 1.5,
    })
    expect(result.success).toBe(false)
  })

  test('string quantity fails', () => {
    const result = addItemSchema.safeParse({
      variantId: 'gid://shopify/ProductVariant/123',
      quantity: '2',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================
// updateQuantity schema
// ============================================

describe('updateQuantity schema', () => {
  test('valid input', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: 'gid://shopify/Product/123',
      quantity: 5,
    })
    expect(result.success).toBe(true)
  })

  test('quantity of 0 is valid (remove item)', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: 'gid://shopify/Product/123',
      quantity: 0,
    })
    expect(result.success).toBe(true)
  })

  test('quantity of 99 is valid (maximum)', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: 'gid://shopify/Product/123',
      quantity: 99,
    })
    expect(result.success).toBe(true)
  })

  test('empty merchandiseId fails', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: '',
      quantity: 1,
    })
    expect(result.success).toBe(false)
  })

  test('missing merchandiseId fails', () => {
    const result = updateQuantitySchema.safeParse({ quantity: 1 })
    expect(result.success).toBe(false)
  })

  test('missing quantity fails', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: 'gid://shopify/Product/123',
    })
    expect(result.success).toBe(false)
  })

  test('quantity over 99 fails', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: 'gid://shopify/Product/123',
      quantity: 100,
    })
    expect(result.success).toBe(false)
  })

  test('negative quantity fails', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: 'gid://shopify/Product/123',
      quantity: -1,
    })
    expect(result.success).toBe(false)
  })

  test('non-integer quantity fails', () => {
    const result = updateQuantitySchema.safeParse({
      merchandiseId: 'gid://shopify/Product/123',
      quantity: 2.5,
    })
    expect(result.success).toBe(false)
  })

  test('both fields missing fails', () => {
    const result = updateQuantitySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
