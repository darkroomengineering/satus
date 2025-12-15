export interface SortOption {
  title: string
  slug: string | null
  sortKey: string
  reverse: boolean
}

export const defaultSort: SortOption = {
  title: 'Relevance',
  slug: null,
  sortKey: 'RELEVANCE',
  reverse: false,
}

export const sorting: SortOption[] = [
  defaultSort,
  {
    title: 'Trending',
    slug: 'trending-desc',
    sortKey: 'BEST_SELLING',
    reverse: false,
  }, // asc
  {
    title: 'Latest arrivals',
    slug: 'latest-desc',
    sortKey: 'CREATED_AT',
    reverse: true,
  },
  {
    title: 'Price: Low to high',
    slug: 'price-asc',
    sortKey: 'PRICE',
    reverse: false,
  }, // asc
  {
    title: 'Price: High to low',
    slug: 'price-desc',
    sortKey: 'PRICE',
    reverse: true,
  },
]

export const TAGS = {
  collections: 'collections',
  products: 'products',
  cart: 'cart',
} as const

export const HIDDEN_PRODUCT_TAG = 'nextjs-frontend-hidden'
export const SHOPIFY_GRAPHQL_API_ENDPOINT = '/api/2023-01/graphql.json'
