import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
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

const endpoint = process.env.SHOPIFY_STORE_DOMAIN + SHOPIFY_GRAPHQL_API_ENDPOINT
const key = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
const domain = process.env.SHOPIFY_STORE_DOMAIN

export async function shopifyFetch({
  cache = 'force-cache',
  headers,
  query,
  tags,
  variables,
}) {
  try {
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': key,
        ...headers,
      },
      body: JSON.stringify({
        ...(query && { query }),
        ...(variables && { variables }),
      }),
      cache,
      ...(tags && { next: { tags } }),
    })

    const body = await result.json()

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

const removeEdgesAndNodes = (array) => {
  return array.edges.map((edge) => edge?.node)
}

const reshapeCart = (cart) => {
  if (!cart.cost?.totalTaxAmount) {
    cart.cost.totalTaxAmount = {
      amount: '0.0',
      currencyCode: 'USD',
    }
  }

  return {
    ...cart,
    lines: removeEdgesAndNodes(cart.lines),
  }
}

const reshapeCollection = (collection) => {
  if (!collection) {
    return undefined
  }

  return {
    ...collection,
    path: `/search/${collection.handle}`,
  }
}

const reshapeCollections = (collections) => {
  const reshapedCollections = []

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

const reshapeImages = (images, productTitle) => {
  const flattened = removeEdgesAndNodes(images)

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(.*)\..*/)[1]
    return {
      ...image,
      altText: image.altText || `${productTitle} - ${filename}`,
    }
  })
}

const reshapeProduct = (product, filterHiddenProducts) => {
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

const reshapeProducts = (products) => {
  const reshapedProducts = []

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

export async function createCart() {
  const res = await shopifyFetch({
    query: createCartMutation,
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartCreate.cart)
}

export async function addToCart(cartId, lines = []) {
  const res = await shopifyFetch({
    query: addToCartMutation,
    variables: {
      cartId,
      lines,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesAdd.cart)
}

export async function removeFromCart(cartId, lineIds = []) {
  const res = await shopifyFetch({
    query: removeFromCartMutation,
    variables: {
      cartId,
      lineIds,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesRemove.cart)
}

export async function updateCart(cartId, lines = []) {
  const res = await shopifyFetch({
    query: editCartItemsMutation,
    variables: {
      cartId,
      lines,
    },
    cache: 'no-store',
  })

  return reshapeCart(res.body.data.cartLinesUpdate.cart)
}

export async function getCart(cartId) {
  const res = await shopifyFetch({
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

export async function getCollection(handle) {
  const res = await shopifyFetch({
    query: getCollectionQuery,
    tags: [TAGS.collections],
    variables: {
      handle,
    },
  })

  return reshapeCollection(res.body.data.collection)
}

export async function getCollectionProducts({ collection, reverse, sortKey }) {
  const res = await shopifyFetch({
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

export async function getCollections() {
  const res = await shopifyFetch({
    query: getCollectionsQuery,
    tags: [TAGS.collections],
  })
  const shopifyCollections = removeEdgesAndNodes(res.body?.data?.collections)
  const collections = [
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

export async function getMenu(handle) {
  const res = await shopifyFetch({
    query: getMenuQuery,
    tags: [TAGS.collections],
    variables: {
      handle,
    },
  })

  return (
    res.body?.data?.menu?.items.map((item) => ({
      title: item.title,
      path: item.url
        .replace(domain, '')
        .replace('/collections', '/search')
        .replace('/pages', ''),
    })) || []
  )
}

export async function getPage(handle) {
  const res = await shopifyFetch({
    query: getPageQuery,
    variables: { handle },
  })

  return res.body.data.pageByHandle
}

export async function getPages() {
  const res = await shopifyFetch({
    query: getPagesQuery,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}

export async function getProduct(handle) {
  const res = await shopifyFetch({
    query: getProductQuery,
    tags: [TAGS.products],
    cache: 'no-store',
    variables: {
      handle,
    },
  })

  return reshapeProduct(res.body.data.product, false)
}

export async function getProductRecommendations(productId) {
  const res = await shopifyFetch({
    query: getProductRecommendationsQuery,
    tags: [TAGS.products],
    variables: {
      productId,
    },
  })

  return reshapeProducts(res.body.data.productRecommendations)
}

export async function getProducts({ query, reverse, sortKey }) {
  const res = await shopifyFetch({
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
export async function revalidate(req) {
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
  const topic = headers().get('x-shopify-topic') || 'unknown'
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
