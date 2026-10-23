import { removeEdgesAndNodes, toProducts } from './adapters'
import { shopifyFetch } from './client'
import { CATALOG_REVALIDATE_SECONDS, TAGS } from './constants'
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
  const res = await shopifyFetch<GetCollectionResponseData>({
    query: getCollectionQuery,
    tags: [TAGS.collections],
    revalidate: CATALOG_REVALIDATE_SECONDS,
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
  const res = await shopifyFetch<GetCollectionProductsResponseData>({
    query: getCollectionProductsQuery,
    tags: [TAGS.collections, TAGS.products],
    revalidate: CATALOG_REVALIDATE_SECONDS,
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
  const res = await shopifyFetch<GetCollectionsResponseData>({
    query: getCollectionsQuery,
    tags: [TAGS.collections],
    revalidate: CATALOG_REVALIDATE_SECONDS,
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
    // `hidden-*` collections stay off the search page.
    ...toCollections(shopifyCollections).filter(
      (collection) => !collection.handle.startsWith('hidden')
    ),
  ]

  return collections
}
