import { cacheLife, cacheTag } from 'next/cache'

import { env } from '@/lib/env'

import { normalizeStoreDomain, shopifyFetch } from './client'
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
 * connected custom domain, or otherwise) or already-relative paths.
 *
 * - Absolute URLs on the store's own domain are converted to a local path
 *   (`pathname + search + hash`) and remapped below.
 * - Absolute URLs on any other host (external sites, e.g. a menu item that
 *   deliberately links to instagram.com) are returned UNCHANGED — rewriting
 *   them to `pathname + search` would silently turn a working external link
 *   into a dead local route.
 * - Invalid/relative URLs pass through `new URL()` as a throw and are
 *   treated as already-local paths, so the remap below still applies to
 *   them (a menu item can be authored as a relative path directly).
 *
 * The extracted local path is then remapped onto this starter's route
 * naming: `/collections` -> `/search` (this app's collection/product browse
 * route is `/search`, not `/collections`), and a leading `/pages/` segment
 * is stripped (Shopify's static "pages" content is served at the site root
 * here, e.g. `/pages/about` -> `/about`). Both remaps are anchored to the
 * leading path segment (`^/collections` / `^/pages/`) so they only ever
 * rewrite the route prefix, never an arbitrary substring inside a handle
 * (e.g. `/products/pages-and-things` must NOT become `/products-and-things`).
 */
function isStoreHost(host: string): boolean {
  // The env var only ever holds the store's `*.myshopify.com` domain — a
  // connected custom domain isn't available at this call site without
  // threading extra config through `getMenu`/`menuItemPath`, so as a
  // deliberate, documented limitation, any `*.myshopify.com` host is also
  // treated as the store (custom domains are not recognized here and will
  // be returned as absolute URLs unchanged, same as any other external host).
  if (host.endsWith('.myshopify.com')) return true

  const storeOrigin = normalizeStoreDomain(env.SHOPIFY_STORE_DOMAIN)
  if (!storeOrigin) return false
  try {
    return new URL(storeOrigin).host === host
  } catch {
    return false
  }
}

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
  'use cache'
  cacheTag(TAGS.collections)
  cacheLife('hours')

  const res = await shopifyFetch<GetMenuResponseData>({
    query: getMenuQuery,
    cache: 'no-store',
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
  'use cache'
  cacheTag(TAGS.pages)
  cacheLife('hours')

  const res = await shopifyFetch<GetPageResponseData>({
    query: getPageQuery,
    cache: 'no-store',
    variables: { handle },
    dataSchema: getPageResponseSchema,
  })

  return res.body.data.pageByHandle
}

export async function getPages(): Promise<Page[]> {
  'use cache'
  cacheTag(TAGS.pages)
  cacheLife('hours')

  const res = await shopifyFetch<GetPagesResponseData>({
    query: getPagesQuery,
    cache: 'no-store',
    dataSchema: getPagesResponseSchema,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}
