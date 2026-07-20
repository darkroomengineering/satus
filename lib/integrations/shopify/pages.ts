import { shopifyFetch } from './client'
import { TAGS } from './constants'
import { getMenuQuery } from './queries/menu'
import { getPageQuery, getPagesQuery } from './queries/page'
import { removeEdgesAndNodes } from './reshape'
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

/**
 * Extract the path portion of a Shopify menu item URL.
 *
 * Menu item URLs may be absolute (on the store's `.myshopify.com` domain, a
 * connected custom domain, or otherwise) or already-relative paths. Parsing
 * as a URL and taking `pathname + search` handles all absolute cases
 * regardless of host; invalid/relative URLs pass through unchanged.
 *
 * The extracted path is then remapped onto this starter's route naming:
 * `/collections` -> `/search` (this app's collection/product browse route
 * is `/search`, not `/collections`), and the `/pages` prefix is stripped
 * (Shopify's static "pages" content is served at the site root here, e.g.
 * `/pages/about` -> `/about`). These remaps are Shopify-menu-specific and
 * only apply to `path`, not the original `url`.
 */
function menuItemPath(url: string): string {
  let path: string
  try {
    const parsed = new URL(url)
    path = parsed.pathname + parsed.search
  } catch {
    path = url
  }
  return path.replace('/collections', '/search').replace('/pages', '')
}

export async function getMenu(handle: string): Promise<MenuItem[]> {
  const res = await shopifyFetch<GetMenuResponseData>({
    query: getMenuQuery,
    tags: [TAGS.collections],
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
    variables: { handle },
    dataSchema: getPageResponseSchema,
  })

  return res.body.data.pageByHandle
}

export async function getPages(): Promise<Page[]> {
  const res = await shopifyFetch<GetPagesResponseData>({
    query: getPagesQuery,
    dataSchema: getPagesResponseSchema,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}
