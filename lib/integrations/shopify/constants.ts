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
  },
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
  },
  {
    title: 'Price: High to low',
    slug: 'price-desc',
    sortKey: 'PRICE',
    reverse: true,
  },
]

// Catalog reads (products, collections, pages, menus) are cached under TAGS
// and refreshed by the Shopify webhook (`revalidate.ts`); this is the
// backstop when a webhook never arrives. Cost: an edit whose webhook is lost
// shows up to an hour late.
export const CATALOG_REVALIDATE_SECONDS = 60 * 60

export const TAGS = {
  collections: 'collections',
  products: 'products',
  pages: 'pages',
  cart: 'cart',
} as const

export const HIDDEN_PRODUCT_TAG = 'nextjs-frontend-hidden'
/**
 * Storefront API version — quarterly releases, ~12-month support window.
 * Check https://shopify.dev/docs/api/usage/versioning before bumping.
 */
export const SHOPIFY_GRAPHQL_API_ENDPOINT = '/api/2026-04/graphql.json'
