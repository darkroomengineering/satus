import { removeEdgesAndNodes, shopifyFetch } from './client'
import { HIDDEN_PRODUCT_TAG, TAGS } from './constants'
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery,
} from './queries/product'
import type {
  EdgeNode,
  Image,
  Product,
  ProductVariant,
  ShopifyImage,
  ShopifyProduct,
} from './types'

export const reshapeImages = (
  images: EdgeNode<ShopifyImage>,
  productTitle: string
): Image[] => {
  const flattened = removeEdgesAndNodes(images)

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(.*)\..*/)?.[1] || 'product'
    return {
      ...image,
      altText: image.altText || `${productTitle} - ${filename}`,
    }
  })
}

export const reshapeProduct = (
  product: ShopifyProduct | null,
  filterHiddenProducts = true
): Product | undefined => {
  if (
    !product ||
    (filterHiddenProducts && product.tags.includes(HIDDEN_PRODUCT_TAG))
  ) {
    return undefined
  }

  const { images, variants, ...rest } = product

  return {
    ...rest,
    images: reshapeImages(images, product.title),
    variants: removeEdgesAndNodes(variants) as ProductVariant[],
  }
}

export const reshapeProducts = (
  products: (ShopifyProduct | null)[]
): Product[] => {
  const reshapedProducts: Product[] = []

  for (const product of products) {
    if (product) {
      const reshapedProduct = reshapeProduct(product)

      if (reshapedProduct) {
        reshapedProducts.push(reshapedProduct)
      }
    }
  }

  return reshapedProducts
}

export async function getProduct({
  handle,
  id,
}: { handle: string; id?: string } | { id: string; handle?: string }): Promise<
  Product | undefined
> {
  const res = await shopifyFetch<{ product: ShopifyProduct | null }>({
    query: getProductQuery,
    tags: [TAGS.products],
    cache: 'no-store',
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
