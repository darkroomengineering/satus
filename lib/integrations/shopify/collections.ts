import { shopifyFetch } from './client'
import { TAGS } from './constants'
import {
  getCollectionProductsQuery,
  getCollectionQuery,
  getCollectionsQuery,
} from './queries/collection'
import { removeEdgesAndNodes, reshapeProducts } from './reshape'
import {
  type GetCollectionProductsResponseData,
  type GetCollectionResponseData,
  type GetCollectionsResponseData,
  getCollectionProductsResponseSchema,
  getCollectionResponseSchema,
  getCollectionsResponseSchema,
} from './schemas'
import type { Collection, Product } from './types'

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
  return collections.flatMap((c) => {
    if (!c) return []
    const reshaped = reshapeCollection(c)
    return reshaped ? [reshaped] : []
  })
}

export async function getCollection(
  handle: string
): Promise<Collection | undefined> {
  const res = await shopifyFetch<GetCollectionResponseData>({
    query: getCollectionQuery,
    tags: [TAGS.collections],
    variables: {
      handle,
    },
    dataSchema: getCollectionResponseSchema,
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
  const res = await shopifyFetch<GetCollectionProductsResponseData>({
    query: getCollectionProductsQuery,
    tags: [TAGS.collections, TAGS.products],
    variables: {
      handle: collection,
      reverse,
      sortKey: sortKey === 'CREATED_AT' ? 'CREATED' : sortKey,
    },
    dataSchema: getCollectionProductsResponseSchema,
  })

  if (!res.body.data.collection) {
    console.warn(`No collection found for \`${collection}\``)
    return []
  }

  return reshapeProducts(removeEdgesAndNodes(res.body.data.collection.products))
}

export async function getCollections(): Promise<Collection[]> {
  const res = await shopifyFetch<GetCollectionsResponseData>({
    query: getCollectionsQuery,
    tags: [TAGS.collections],
    dataSchema: getCollectionsResponseSchema,
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
      updatedAt: '1970-01-01T00:00:00Z',
    },
    // Filter out the `hidden` collections.
    // Collections that start with `hidden-*` need to be hidden on the search page.
    ...reshapeCollections(shopifyCollections).filter(
      (collection) => !collection.handle.startsWith('hidden')
    ),
  ]

  return collections
}
