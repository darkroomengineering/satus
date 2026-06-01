import { shopifyFetch } from './client'
import { TAGS } from './constants'
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery,
} from './queries/product'
import { removeEdgesAndNodes, reshapeProduct, reshapeProducts } from './reshape'
import type { EdgeNode, Product, ShopifyProduct } from './types'

export async function getProduct({
  handle,
  id,
}: { handle: string; id?: string } | { id: string; handle?: string }): Promise<
  Product | undefined
> {
  const res = await shopifyFetch<{ product: ShopifyProduct | null }>({
    query: getProductQuery,
    tags: [TAGS.products],
    variables: {
      handle,
      id,
    },
  })

  return reshapeProduct(res.body.data.product, false)
}

export async function getProductRecommendations(
  productId: string
): Promise<Product[]> {
  const res = await shopifyFetch<{ productRecommendations: ShopifyProduct[] }>({
    query: getProductRecommendationsQuery,
    tags: [TAGS.products],
    variables: {
      productId,
    },
  })

  return reshapeProducts(res.body.data.productRecommendations)
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
  const res = await shopifyFetch<{ products: EdgeNode<ShopifyProduct> }>({
    query: getProductsQuery,
    tags: [TAGS.products],
    variables: {
      query,
      reverse,
      sortKey,
    },
  })

  return reshapeProducts(removeEdgesAndNodes(res.body.data.products))
}
