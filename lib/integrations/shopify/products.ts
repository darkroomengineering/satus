import { cacheLife, cacheTag } from 'next/cache'

import { removeEdgesAndNodes, toProduct, toProducts } from './adapters'
import { shopifyFetch } from './client'
import { TAGS } from './constants'
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery,
} from './queries/product'
import {
  type GetProductRecommendationsResponseData,
  type GetProductResponseData,
  type GetProductsResponseData,
  getProductRecommendationsResponseSchema,
  getProductResponseSchema,
  getProductsResponseSchema,
} from './schemas'
import type { Product } from './types'

export async function getProduct({
  handle,
  id,
}: { handle: string; id?: string } | { id: string; handle?: string }): Promise<
  Product | undefined
> {
  'use cache'
  cacheTag(TAGS.products)
  cacheLife('hours')

  const res = await shopifyFetch<GetProductResponseData>({
    query: getProductQuery,
    cache: 'no-store',
    variables: {
      handle,
      id,
    },
    dataSchema: getProductResponseSchema,
  })

  return toProduct(res.body.data.product, false)
}

export async function getProductRecommendations(
  productId: string
): Promise<Product[]> {
  'use cache'
  cacheTag(TAGS.products)
  cacheLife('hours')

  const res = await shopifyFetch<GetProductRecommendationsResponseData>({
    query: getProductRecommendationsQuery,
    cache: 'no-store',
    variables: {
      productId,
    },
    dataSchema: getProductRecommendationsResponseSchema,
  })

  return toProducts(res.body.data.productRecommendations)
}

interface GetProductsOptions {
  query?: string
  reverse?: boolean
  sortKey?: string
}

export async function getProducts({
  query,
  reverse,
  sortKey,
}: GetProductsOptions): Promise<Product[]> {
  'use cache'
  cacheTag(TAGS.products)
  cacheLife('hours')

  const res = await shopifyFetch<GetProductsResponseData>({
    query: getProductsQuery,
    cache: 'no-store',
    variables: {
      query,
      reverse,
      sortKey,
    },
    dataSchema: getProductsResponseSchema,
  })

  return toProducts(removeEdgesAndNodes(res.body.data.products))
}
