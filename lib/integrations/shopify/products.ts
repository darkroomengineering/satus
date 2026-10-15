import { removeEdgesAndNodes, toProduct, toProducts } from './adapters'
import { shopifyFetch } from './client'
import { CATALOG_REVALIDATE_SECONDS, TAGS } from './constants'
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
  const res = await shopifyFetch<GetProductResponseData>({
    query: getProductQuery,
    tags: [TAGS.products],
    revalidate: CATALOG_REVALIDATE_SECONDS,
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
  const res = await shopifyFetch<GetProductRecommendationsResponseData>({
    query: getProductRecommendationsQuery,
    tags: [TAGS.products],
    revalidate: CATALOG_REVALIDATE_SECONDS,
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

// Shopify's search DSL has no built-in length limit, so an unbounded query
// string is the one user-input boundary in this codebase without a cap
// (Sanity slugs and cart quantities are both bounded elsewhere). Truncate
// rather than reject — a too-long query still runs, just clipped.
const MAX_QUERY_LENGTH = 200

export async function getProducts({
  query,
  reverse,
  sortKey,
}: GetProductsOptions): Promise<Product[]> {
  const res = await shopifyFetch<GetProductsResponseData>({
    query: getProductsQuery,
    tags: [TAGS.products],
    revalidate: CATALOG_REVALIDATE_SECONDS,
    variables: {
      query: query?.trim().slice(0, MAX_QUERY_LENGTH),
      reverse,
      sortKey,
    },
    dataSchema: getProductsResponseSchema,
  })

  return toProducts(removeEdgesAndNodes(res.body.data.products))
}
