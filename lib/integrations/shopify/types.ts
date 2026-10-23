import type { ZodType } from 'zod'

/** A JSON-serializable GraphQL variable value, the contract `shopifyFetch`'s `JSON.stringify` requires. */
export type GraphQLVariableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly GraphQLVariableValue[]
  | { [key: string]: GraphQLVariableValue }

export interface ShopifyFetchOptions<T = unknown> {
  cache?: RequestCache
  headers?: HeadersInit
  query: string
  tags?: string[]
  /** Seconds before the Data Cache refetches. Only for cached reads. */
  revalidate?: number
  variables?: Record<string, GraphQLVariableValue>
  /**
   * Validates the response `data` at the boundary. When omitted, the caller
   * accepts the raw cast (opt-in trust).
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

export interface Money {
  amount: string
  currencyCode: string
}

export interface DefaultCart {
  checkoutUrl: string
  totalQuantity: number
  cost: {
    // Deprecated and nullable on the Storefront API; `toCart` falls back to
    // a zero amount.
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

// After reshaping data
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

export type CartLineMutation = Pick<CartLineItem, 'id' | 'merchandise'>

export interface CartLineInput {
  merchandiseId: string
  quantity: number
}

export interface AddItemPayload {
  variantId: string
  quantity?: number
}

export interface UpdateItemQuantityPayload {
  merchandiseId: string
  quantity: number
  lineId?: string | undefined
}

export interface Collection {
  handle: string
  title: string
  description?: string
  // `SEO.title`/`description` are `null` until a merchant sets them;
  // consumers fall back with `??`.
  seo?: {
    title: string | null
    description: string | null
  }
  path?: string
  updatedAt?: string
}

export interface ShopifyImage {
  url: string
  // `null` (not just absent) when an image has no alt text.
  altText?: string | null
  // `null` when the image isn't hosted by Shopify.
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

export interface Page {
  id: string
  title: string
  handle: string
  body: string
  bodySummary: string
  // Unlike Product/Collection, `Page.seo` itself is nullable.
  seo?: {
    title: string | null
    description: string | null
  } | null
  createdAt: string
  updatedAt: string
}

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
