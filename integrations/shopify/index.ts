import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  HIDDEN_PRODUCT_TAG,
  SHOPIFY_GRAPHQL_API_ENDPOINT,
  TAGS,
} from './constants'
import {
  addToCartMutation,
  createCartMutation,
  editCartItemsMutation,
  removeFromCartMutation,
} from './mutations/cart'
import { getCartQuery } from './queries/cart'
import {
  getCollectionProductsQuery,
  getCollectionQuery,
  getCollectionsQuery,
} from './queries/collection'
import { getMenuQuery } from './queries/menu'
import { getPageQuery, getPagesQuery } from './queries/page'
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery,
} from './queries/product'

const endpoint = `${process.env.SHOPIFY_STORE_DOMAIN || ''}${SHOPIFY_GRAPHQL_API_ENDPOINT}`
const key = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || ''
const domain = process.env.SHOPIFY_STORE_DOMAIN || ''

interface ShopifyFetchOptions {
  cache?: RequestCache
  headers?: HeadersInit
  query: string
  tags?: string[]
  variables?: Record<string, unknown>
}

interface ShopifyResponse<T = Record<string, unknown>> {
  status: number
  body: {
    data: T
    errors?: Array<{ message: string }>
  }
}

export async function shopifyFetch<T = Record<string, unknown>>({
  cache = 'force-cache',
  headers: customHeaders,
  query,
  tags,
  variables,
}: ShopifyFetchOptions): Promise<ShopifyResponse<T>> {
  try {
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': key,
        ...customHeaders,
      },
      body: JSON.stringify({
        ...(query && { query }),
        ...(variables && { variables }),
      }),
      cache,
      ...(tags && { next: { tags } }),
    })

    const body = (await result.json()) as {
      data: T
      errors?: Array<{ message: string }>
    }

    if (body.errors) {
      throw body.errors[0]
    }

    return {
      status: result.status,
      body,
    }
  } catch (e) {
    throw {
      error: e,
      query,
    }
  }
}

interface EdgeNode<T> {
  edges: Array<{ node: T }>
}

const removeEdgesAndNodes = <T>(array: EdgeNode<T>): T[] => {
  return array.edges.map((edge) => edge?.node)
}

interface Money {
  amount: string
  currencyCode: string
}

interface ShopifyCart {
  cost: {
    totalTaxAmount?: Money
    subtotalAmount: Money
    totalAmount: Money
  }
  lines: EdgeNode<unknown>
  [key: string]: unknown
}

interface Cart {
  cost: {
    totalTaxAmount: Money
    subtotalAmount: Money
    totalAmount: Money
  }
  lines: unknown[]
  [key: string]: unknown
}

const reshapeCart = (cart: ShopifyCart): Cart => {
  const totalTaxAmount = cart.cost?.totalTaxAmount || {
    amount: '0.0',
    currencyCode: 'USD',
  }

  return {
    ...cart,
    cost: {
      ...cart.cost,
      totalTaxAmount,
    },
    lines: removeEdgesAndNodes(cart.lines),
  }
}

interface Collection {
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

const reshapeCollection = (
  collection: Collection | null
): Collection | undefined => {
  if (!collection) {
    return undefined
  }

  return {
    ...collection,
    path: `/search/${collection.handle}`,
  }
}

const reshapeCollections = (
  collections: (Collection | null)[]
): Collection[] => {
  const reshapedCollections: Collection[] = []

  for (const collection of collections) {
    if (collection) {
      const reshapedCollection = reshapeCollection(collection)

      if (reshapedCollection) {
        reshapedCollections.push(reshapedCollection)
      }
    }
  }

  return reshapedCollections
}

interface ShopifyImage {
  url: string
  altText?: string
  width?: number
  height?: number
}

interface Image extends ShopifyImage {
  altText: string
}

const reshapeImages = (
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

interface ShopifyProduct {
  title: string
  tags: string[]
  images: EdgeNode<ShopifyImage>
  variants: EdgeNode<unknown>
  [key: string]: unknown
}

interface Product {
  title: string
  tags: string[]
  images: Image[]
  variants: unknown[]
  [key: string]: unknown
}

const reshapeProduct = (
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

const reshapeProducts = (products: (ShopifyProduct | null)[]): Product[] => {
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

export async function createCart(): Promise<Cart> {
  const res = await shopifyFetch<{ cartCreate: { cart: ShopifyCart } }>({
    query: createCartMutation,
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartCreate.cart)
}

interface CartLineInput {
  merchandiseId: string
  quantity: number
}

export async function addToCart(
  cartId: string,
  lines: CartLineInput[] = []
): Promise<Cart> {
  const res = await shopifyFetch<{ cartLinesAdd: { cart: ShopifyCart } }>({
    query: addToCartMutation,
    variables: {
      cartId,
      lines,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesAdd.cart)
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[] = []
): Promise<Cart> {
  const res = await shopifyFetch<{ cartLinesRemove: { cart: ShopifyCart } }>({
    query: removeFromCartMutation,
    variables: {
      cartId,
      lineIds,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesRemove.cart)
}

interface CartLineUpdateInput {
  id: string
  merchandiseId: string
  quantity: number
}

export async function updateCart(
  cartId: string,
  lines: CartLineUpdateInput[] = []
): Promise<Cart> {
  const res = await shopifyFetch<{ cartLinesUpdate: { cart: ShopifyCart } }>({
    query: editCartItemsMutation,
    variables: {
      cartId,
      lines,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesUpdate.cart)
}

export async function getCart(cartId: string): Promise<Cart | undefined> {
  const res = await shopifyFetch<{ cart: ShopifyCart | null }>({
    query: getCartQuery,
    variables: { cartId },
    tags: [TAGS.cart],
    cache: 'no-store',
  })

  // Old carts becomes `null` when you checkout.
  if (!res.body.data.cart) {
    return undefined
  }

  return reshapeCart(res.body.data.cart)
}

export async function getCollection(
  handle: string
): Promise<Collection | undefined> {
  const res = await shopifyFetch<{ collection: Collection | null }>({
    query: getCollectionQuery,
    tags: [TAGS.collections],
    variables: {
      handle,
    },
  })

  return reshapeCollection(res.body.data.collection)
}

interface GetCollectionProductsOptions {
  collection: string
  reverse?: boolean
  sortKey?: string
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey,
}: GetCollectionProductsOptions): Promise<Product[]> {
  const res = await shopifyFetch<{
    collection: { products: EdgeNode<ShopifyProduct> } | null
  }>({
    query: getCollectionProductsQuery,
    tags: [TAGS.collections, TAGS.products],
    cache: 'no-store',
    variables: {
      handle: collection,
      reverse,
      sortKey: sortKey === 'CREATED_AT' ? 'CREATED' : sortKey,
    },
  })

  if (!res.body.data.collection) {
    console.log(`No collection found for \`${collection}\``)
    return []
  }

  return reshapeProducts(removeEdgesAndNodes(res.body.data.collection.products))
}

export async function getCollections(): Promise<Collection[]> {
  const res = await shopifyFetch<{ collections: EdgeNode<Collection> }>({
    query: getCollectionsQuery,
    tags: [TAGS.collections],
  })
  const shopifyCollections = removeEdgesAndNodes(res.body.data.collections)
  const collections: Collection[] = [
    {
      handle: '',
      title: 'All',
      description: 'All products',
      seo: {
        title: 'All',
        description: 'All products',
      },
      path: '/search',
      updatedAt: new Date().toISOString(),
    },
    // Filter out the `hidden` collections.
    // Collections that start with `hidden-*` need to be hidden on the search page.
    ...reshapeCollections(shopifyCollections).filter(
      (collection) => !collection.handle.startsWith('hidden')
    ),
  ]

  return collections
}

interface MenuItem {
  title: string
  path: string
}

export async function getMenu(handle: string): Promise<MenuItem[]> {
  const res = await shopifyFetch<{
    menu: { items: Array<{ title: string; url: string }> } | null
  }>({
    query: getMenuQuery,
    tags: [TAGS.collections],
    variables: {
      handle,
    },
  })

  return (
    res.body.data.menu?.items.map((item) => ({
      title: item.title,
      path: item.url
        .replace(domain, '')
        .replace('/collections', '/search')
        .replace('/pages', ''),
    })) || []
  )
}

export async function getPage(handle: string): Promise<unknown> {
  const res = await shopifyFetch<{ pageByHandle: unknown }>({
    query: getPageQuery,
    variables: { handle },
  })

  return res.body.data.pageByHandle
}

export async function getPages(): Promise<unknown[]> {
  const res = await shopifyFetch<{ pages: EdgeNode<unknown> }>({
    query: getPagesQuery,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  const res = await shopifyFetch<{ product: ShopifyProduct | null }>({
    query: getProductQuery,
    tags: [TAGS.products],
    cache: 'no-store',
    variables: {
      handle,
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

// This is called from `app/api/revalidate.ts` so providers can control revalidation logic.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // We always need to respond with a 200 status code to Shopify,
  // otherwise it will continue to retry the request.
  const collectionWebhooks = [
    'collections/create',
    'collections/delete',
    'collections/update',
  ]
  const productWebhooks = [
    'products/create',
    'products/delete',
    'products/update',
  ]
  const headersList = await headers()
  const topic = headersList.get('x-shopify-topic') || 'unknown'
  const secret = req.nextUrl.searchParams.get('secret')
  const isCollectionUpdate = collectionWebhooks.includes(topic)
  const isProductUpdate = productWebhooks.includes(topic)

  if (!secret || secret !== process.env.SHOPIFY_REVALIDATION_SECRET) {
    console.error('Invalid revalidation secret.')
    return NextResponse.json({ status: 200 })
  }

  if (!(isCollectionUpdate || isProductUpdate)) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({ status: 200 })
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections)
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products)
  }

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() })
}
