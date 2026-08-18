import type { ZodType } from 'zod'

/**
 * A JSON-serializable value accepted as a Storefront API GraphQL variable.
 * Query variables (ids, handles, cart line arrays, etc.) are plain JSON —
 * this is the value contract `JSON.stringify` in `shopifyFetch` actually
 * requires, in place of an `unknown` escape hatch.
 */
export type GraphQLVariableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly GraphQLVariableValue[]
  | { [key: string]: GraphQLVariableValue }

/* Fetch types  */
export interface ShopifyFetchOptions<T = unknown> {
  cache?: RequestCache
  headers?: HeadersInit
  query: string
  tags?: string[]
  variables?: Record<string, GraphQLVariableValue>
  /**
   * Optional Zod schema for the GraphQL response payload (`data` field).
   * When provided, the payload is validated at the Shopify boundary before
   * being returned to callers. When omitted, the caller accepts the raw cast
   * (opt-in trust — useful for callers that have their own downstream checks).
   */
  dataSchema?: ZodType<T>
}

export interface ShopifyResponse<T = unknown> {
  status: number
  body: {
    data: T
    errors?: { message: string }[]
  }
}

/* Cart types */
export interface Money {
  amount: string
  currencyCode: string
}

export interface DefaultCart {
  checkoutUrl: string
  totalQuantity: number
  cost: {
    // `CartCost.totalTaxAmount` is a deprecated, nullable field on the
    // Storefront API — Shopify can return `null`. `toCart` already
    // falls back to a zero amount when it's absent.
    totalTaxAmount: Money | null
    subtotalAmount: Money
    totalAmount: Money
  }
}

// Before reshaping data (raw Shopify API response)
export interface ShopifyCart extends DefaultCart {
  id: string
  lines: EdgeNode<ShopifyCartLineItem>
}

export interface ShopifyCartLineItem {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    selectedOptions: { name: string; value: string }[]
    product: {
      id: string
      handle: string
      title: string
      featuredImage: ShopifyImage | null
    }
  }
  cost: {
    totalAmount: Money
  }
}

// After reshaping data — the full post-reshape line-item shape
export interface CartLineItem {
  id: string
  quantity: number
  cost: {
    totalAmount: Money
  }
  merchandise: {
    id: string
    title: string
    selectedOptions: { name: string; value: string }[]
    product: {
      id: string
      handle: string
      title: string
      featuredImage: Image | null
    }
  }
}

// After reshaping data
export interface Cart extends DefaultCart {
  id: string
  lines: CartLineItem[]
  cost: {
    subtotalAmount: Money
    totalAmount: Money
    totalTaxAmount: Money
  }
}

// Minimal shape used for cart-mutation payloads (derived from CartLineItem)
export type CartLineMutation = Pick<CartLineItem, 'id' | 'merchandise'>

export interface CartLineInput {
  merchandiseId: string
  quantity: number
}

/* Cart actions types */
export interface AddItemPayload {
  variantId: string
  quantity?: number
}

export interface UpdateItemQuantityPayload {
  merchandiseId: string
  quantity: number
  lineId?: string | undefined
}

/* Collection types */
export interface Collection {
  handle: string
  title: string
  description?: string
  // Storefront API `SEO.title` / `SEO.description` are nullable and are
  // `null` until a merchant explicitly sets meta title/description in the
  // admin — every consumer already falls back with `??`.
  seo?: {
    title: string | null
    description: string | null
  }
  path?: string
  updatedAt?: string
}

export interface ShopifyImage {
  url: string
  // Shopify returns `null` (not just an absent field) when an image has no
  // alt text — every consumer already falls back with `??`, so the type
  // reflects that.
  altText?: string | null
  // Storefront API `Image.width` / `Image.height` are nullable — they
  // return `null` when the image isn't hosted by Shopify.
  width?: number | null
  height?: number | null
}

export interface Image extends ShopifyImage {
  altText: string
}

export interface EdgeNode<T> {
  edges: { node: T }[]
}

// Before reshaping data (raw Shopify API response)
export interface ShopifyProduct {
  id: string
  handle: string
  title: string
  tags: string[]
  availableForSale: boolean
  images: EdgeNode<ShopifyImage>
  variants: EdgeNode<ShopifyProductVariant>
  description?: string
  descriptionHtml?: string
  priceRange?: {
    minVariantPrice: Money
    maxVariantPrice: Money
  }
  // See the `Collection.seo` comment — SEO title/description are nullable.
  seo?: {
    title: string | null
    description: string | null
  }
}

export interface ShopifyProductVariant {
  id: string
  title: string
  availableForSale: boolean
  selectedOptions: { name: string; value: string }[]
  price: Money
}

// After reshaping data
export interface Product {
  id: string
  handle: string
  title: string
  tags: string[]
  images: Image[]
  featuredImage?: Image | null
  availableForSale: boolean
  variants: ProductVariant[]
  options?: {
    id: string
    name: string
    values: string[]
  }[]
  description?: string
  descriptionHtml?: string
  priceRange?: {
    minVariantPrice: Money
    maxVariantPrice: Money
  }
  // See the `Collection.seo` comment — SEO title/description are nullable.
  seo?: {
    title: string | null
    description: string | null
  }
}

export interface ProductVariant {
  id: string
  price: {
    amount: string
    currencyCode: string
  }
  selectedOptions: { name: string; value: string }[]
  title: string
}

/* Page types */
export interface Page {
  id: string
  title: string
  handle: string
  body: string
  bodySummary: string
  // Unlike Product/Collection, Storefront API `Page.seo` itself is nullable
  // (not just its title/description) — it's `null` until a merchant sets
  // page-level SEO metadata in the admin.
  seo?: {
    title: string | null
    description: string | null
  } | null
  createdAt: string
  updatedAt: string
}

/* Customer types */
export interface Customer {
  id: string
  email: string
  firstName: string
  lastName: string
  orders: {
    edges: {
      node: { id: string; orderNumber: number; totalPrice: Money }
    }[]
  }
}
