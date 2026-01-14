/* Fetch types  */
export interface ShopifyFetchOptions {
  cache?: RequestCache
  headers?: HeadersInit
  query: string
  tags?: string[]
  variables?: Record<string, unknown>
}

export interface ShopifyResponse<T = Record<string, unknown>> {
  status: number
  body: {
    data: T
    errors?: Array<{ message: string }>
  }
}

/* Cart types */
export interface Money {
  amount: string
  currencyCode: string
}

export interface defaultCart {
  checkoutUrl: string
  totalQuantity: number
  cost: {
    totalTaxAmount: Money
    subtotalAmount: Money
    totalAmount: Money
  }
}

// Before reshaping data (raw Shopify API response)
export interface ShopifyCart extends defaultCart {
  id: string
  lines: EdgeNode<ShopifyCartLineItem>
}

export interface ShopifyCartLineItem {
  id: string
  quantity: number
  merchandise: {
    id: string
    title: string
    selectedOptions: Array<{ name: string; value: string }>
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
export interface Cart extends defaultCart {
  id?: string
  lines: Array<{
    id?: string
    quantity: number
    cost: {
      totalAmount: {
        amount: string
        currencyCode: string
      }
    }
    merchandise: {
      id: string
      title: string
      selectedOptions: Array<{ name: string; value: string }>
      product: {
        id: string
        handle: string
        title: string
        featuredImage: Image | null
      }
    }
  }>
  cost: {
    subtotalAmount: Money
    totalAmount: Money
    totalTaxAmount: Money
  }
}

export interface CartLine {
  id?: string
  merchandise: {
    id: string
  }
}

export interface CartLineInput {
  merchandiseId: string
  quantity: number
}

export interface CartData {
  lines: CartLine[]
}

/* Cart actions types */
export interface AddItemPayload {
  variantId: string
  quantity?: number
}

export interface UpdateItemQuantityPayload {
  merchandiseId: string
  quantity: number
}

/* Collection types */
export interface Collection {
  handle: string
  title: string
  description?: string
  seo?: {
    title: string
    description: string
  }
  path?: string
  updatedAt?: string
}

export interface ShopifyImage {
  url: string
  altText?: string
  width?: number
  height?: number
}

export interface Image extends ShopifyImage {
  altText: string
}

export interface EdgeNode<T> {
  edges: Array<{ node: T }>
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
    title: string
    description: string
  }
}

export interface ShopifyProductVariant {
  id: string
  title: string
  availableForSale: boolean
  selectedOptions: Array<{ name: string; value: string }>
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
  options?: Array<{
    id: string
    name: string
    values: string[]
  }>
  description?: string
  descriptionHtml?: string
  priceRange?: {
    minVariantPrice: Money
    maxVariantPrice: Money
  }
  seo?: {
    title: string
    description: string
  }
}

export interface ProductVariant {
  id: string
  price: {
    amount: string
    currencyCode: string
  }
  selectedOptions: Array<{ name: string; value: string }>
  title: string
}

/* Customer types */
export interface Customer {
  id: string
  email: string
  firstName: string
  lastName: string
  orders: {
    edges: Array<{
      node: { id: string; orderNumber: number; totalPrice: Money }
    }>
  }
}
