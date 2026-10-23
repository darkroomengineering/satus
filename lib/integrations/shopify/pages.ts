import { env } from '@/lib/env'

import { removeEdgesAndNodes } from './adapters'
import { normalizeStoreDomain, shopifyFetch } from './client'
import { CATALOG_REVALIDATE_SECONDS, TAGS } from './constants'
import { getMenuQuery } from './queries/menu'
import { getPageQuery, getPagesQuery } from './queries/page'
import {
  type GetMenuResponseData,
  type GetPageResponseData,
  type GetPagesResponseData,
  getMenuResponseSchema,
  getPageResponseSchema,
  getPagesResponseSchema,
} from './schemas'
import type { Page } from './types'

interface MenuItem {
  title: string
  path: string
}

function isStoreHost(host: string): boolean {
  // Match the configured domain exactly, not any `*.myshopify.com`: a menu
  // item on another store is an external link, and localizing it would turn a
  // working URL into a dead route.
  const storeOrigin = normalizeStoreDomain(env.SHOPIFY_STORE_DOMAIN)
  if (storeOrigin) {
    try {
      return new URL(storeOrigin).host === host
    } catch {
      // Malformed config — fall through to the heuristic below.
    }
  }

  // No usable config: treat the platform domain as local, the only host
  // Shopify authors absolute menu URLs on. Known limitation either way: a
  // connected custom domain isn't visible here, so its menu items stay
  // absolute (they work, but skip the local-route remap).
  return host.endsWith('.myshopify.com')
}

/**
 * Local path for a menu item URL. Absolute URLs on other hosts are returned
 * unchanged (rewriting them would turn a working external link into a dead
 * route); store-host and relative URLs are remapped onto this app's routes:
 * `/collections` -> `/search`, and a leading `/pages/` is stripped. Both
 * remaps are anchored to the leading segment so a handle like
 * `/products/pages-and-things` is untouched.
 */
export function menuItemPath(url: string): string {
  let path: string
  try {
    const parsed = new URL(url)
    if (!isStoreHost(parsed.host)) {
      return url
    }
    path = parsed.pathname + parsed.search + parsed.hash
  } catch {
    path = url
  }
  return path
    .replace(/^\/collections(?=\/|$)/, '/search')
    .replace(/^\/pages\//, '/')
}

export async function getMenu(handle: string): Promise<MenuItem[]> {
  const res = await shopifyFetch<GetMenuResponseData>({
    query: getMenuQuery,
    tags: [TAGS.collections],
    revalidate: CATALOG_REVALIDATE_SECONDS,
    variables: {
      handle,
    },
    dataSchema: getMenuResponseSchema,
  })

  return (
    res.body.data.menu?.items.map((item) => ({
      title: item.title,
      path: menuItemPath(item.url),
    })) ?? []
  )
}

export async function getPage(handle: string): Promise<Page | null> {
  const res = await shopifyFetch<GetPageResponseData>({
    query: getPageQuery,
    tags: [TAGS.pages],
    revalidate: CATALOG_REVALIDATE_SECONDS,
    variables: { handle },
    dataSchema: getPageResponseSchema,
  })

  return res.body.data.pageByHandle
}

export async function getPages(): Promise<Page[]> {
  const res = await shopifyFetch<GetPagesResponseData>({
    query: getPagesQuery,
    tags: [TAGS.pages],
    revalidate: CATALOG_REVALIDATE_SECONDS,
    dataSchema: getPagesResponseSchema,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}
