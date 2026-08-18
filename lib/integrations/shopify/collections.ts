import { cacheLife, cacheTag } from 'next/cache'

import { removeEdgesAndNodes, toProducts } from './adapters'
import { shopifyFetch } from './client'
import { TAGS } from './constants'
import {
  getCollectionProductsQuery,
  getCollectionQuery,
  getCollectionsQuery,
} from './queries/collection'
import {
  type GetCollectionProductsResponseData,
  type GetCollectionResponseData,
  type GetCollectionsResponseData,
  getCollectionProductsResponseSchema,
  getCollectionResponseSchema,
  getCollectionsResponseSchema,
} from './schemas'
import type { Collection, Product } from './types'

const toCollection = (
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

const toCollections = (collections: (Collection | null)[]): Collection[] => {
  return collections.flatMap((c) => {
    if (!c) return []
    const adapted = toCollection(c)
    return adapted ? [adapted] : []
  })
}

export async function getCollection(
  handle: string
): Promise<Collection | undefined> {
  'use cache'
  cacheTag(TAGS.collections)
  cacheLife('hours')

  const res = await shopifyFetch<GetCollectionResponseData>({
    query: getCollectionQuery,
    cache: 'no-store',
    variables: {
      handle,
    },
    dataSchema: getCollectionResponseSchema,
  })

  return toCollection(res.body.data.collection)
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
  'use cache'
  cacheTag(TAGS.collections, TAGS.products)
  cacheLife('hours')

  const res = await shopifyFetch<GetCollectionProductsResponseData>({
    query: getCollectionProductsQuery,
    cache: 'no-store',
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

  return toProducts(removeEdgesAndNodes(res.body.data.collection.products))
}

export async function getCollections(): Promise<Collection[]> {
  'use cache'
  cacheTag(TAGS.collections)
  cacheLife('hours')

  const res = await shopifyFetch<GetCollectionsResponseData>({
    query: getCollectionsQuery,
    cache: 'no-store',
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
    ...toCollections(shopifyCollections).filter(
      (collection) => !collection.handle.startsWith('hidden')
    ),
  ]

  return collections
}
