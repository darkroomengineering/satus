/**
 * Unit tests for Shopify product schema validation: `featuredImage` must
 * survive parsing, or the cart-drawer thumbnail is blank until
 * router.refresh() lands.
 */

import { describe, expect, test } from 'bun:test'

import { parseApiResponse } from '@/lib/utils/validation'

import { getProductResponseSchema } from './schemas'
import type { ShopifyImage } from './types'

function buildProductFixture(featuredImage: ShopifyImage | null | undefined) {
  return {
    product: {
      id: 'gid://shopify/Product/1',
      handle: 'test-product',
      title: 'Test Product',
      tags: [],
      availableForSale: true,
      images: { edges: [] },
      featuredImage,
      variants: { edges: [] },
      description: 'A product',
      descriptionHtml: '<p>A product</p>',
      options: [],
      priceRange: {
        minVariantPrice: { amount: '10.00', currencyCode: 'USD' },
        maxVariantPrice: { amount: '10.00', currencyCode: 'USD' },
      },
      seo: { title: null, description: null },
      updatedAt: '2026-01-01T00:00:00Z',
    },
  }
}

describe('shopifyProductSchema featuredImage', () => {
  test('featuredImage survives parseApiResponse when present', () => {
    const fixture = buildProductFixture({
      url: 'https://cdn.shopify.com/featured.jpg',
      altText: 'Featured shot',
      width: 800,
      height: 600,
    })

    const parsed = parseApiResponse(
      getProductResponseSchema,
      fixture,
      'Shopify Storefront data'
    )

    expect(parsed.product?.featuredImage).toEqual({
      url: 'https://cdn.shopify.com/featured.jpg',
      altText: 'Featured shot',
      width: 800,
      height: 600,
    })
  })

  test('featuredImage null (product with no images) parses to null, not stripped', () => {
    const fixture = buildProductFixture(null)

    const parsed = parseApiResponse(
      getProductResponseSchema,
      fixture,
      'Shopify Storefront data'
    )

    expect(parsed.product?.featuredImage).toBeNull()
  })

  test('a fixture missing featuredImage entirely fails validation (field is required, not optional)', () => {
    const fixture = buildProductFixture(undefined) as {
      product: Omit<
        ReturnType<typeof buildProductFixture>['product'],
        'featuredImage'
      > & { featuredImage?: ShopifyImage | null }
    }
    delete fixture.product.featuredImage

    const result = getProductResponseSchema.safeParse(fixture)
    expect(result.success).toBe(false)
  })
})
