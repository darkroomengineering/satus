import { HIDDEN_PRODUCT_TAG } from './constants'
import type {
  EdgeNode,
  Image,
  Product,
  ShopifyImage,
  ShopifyProduct,
} from './types'

/**
 * Shared Shopify response-adapting helpers.
 *
 * Storefront API responses wrap lists in `{ edges: [{ node }] }` and nest
 * images/variants; these helpers flatten and normalize them into the app's
 * domain types. Used by products, collections, and cart modules.
 */

export const removeEdgesAndNodes = <T>(array: EdgeNode<T>): T[] => {
  return array.edges.map((edge) => edge?.node)
}

export const toImages = (
  images: EdgeNode<ShopifyImage>,
  productTitle: string
): Image[] => {
  const flattened = removeEdgesAndNodes(images)

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(?<name>.*)\..*/)?.[1] ?? 'product'
    return {
      ...image,
      altText: image.altText ?? `${productTitle} - ${filename}`,
    }
  })
}

export const toProduct = (
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
    images: toImages(images, product.title),
    variants: removeEdgesAndNodes(variants),
  }
}

export const toProducts = (products: (ShopifyProduct | null)[]): Product[] => {
  return products.flatMap((p) => {
    const adapted = toProduct(p)
    return adapted ? [adapted] : []
  })
}
