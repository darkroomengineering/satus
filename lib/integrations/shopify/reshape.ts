import { HIDDEN_PRODUCT_TAG } from './constants'
import type {
  EdgeNode,
  Image,
  Product,
  ShopifyImage,
  ShopifyProduct,
} from './types'

/**
 * Shared Shopify response-reshaping helpers.
 *
 * Storefront API responses wrap lists in `{ edges: [{ node }] }` and nest
 * images/variants; these helpers flatten and normalize them into the app's
 * domain types. Used by products, collections, and cart modules.
 */

export const removeEdgesAndNodes = <T>(array: EdgeNode<T>): T[] => {
  return array.edges.map((edge) => edge?.node)
}

export const reshapeImages = (
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
    variants: removeEdgesAndNodes(variants),
  }
}

export const reshapeProducts = (
  products: (ShopifyProduct | null)[]
): Product[] => {
  return products.flatMap((p) => {
    const reshaped = reshapeProduct(p)
    return reshaped ? [reshaped] : []
  })
}
