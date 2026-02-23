import { removeEdgesAndNodes, shopifyFetch } from './client'
import { TAGS } from './constants'
import { reshapeProducts } from './products'
import {
  getCollectionProductsQuery,
  getCollectionQuery,
  getCollectionsQuery,
} from './queries/collection'
import type { Collection, EdgeNode, Product, ShopifyProduct } from './types'

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
