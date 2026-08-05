/**
 * Unit tests for `menuItemPath` (pages.ts).
 *
 * Covers issue #384: unanchored `String.replace` remaps corrupting product
 * handles that merely contain `/pages` or `/collections` as a substring, and
 * absolute URLs (external links, hashes) being collapsed into dead local
 * routes.
 *
 * Run with: bun test lib/integrations/shopify/pages.test.ts
 */

import { describe, expect, test } from 'bun:test'

import { env } from '@/lib/env'

import { normalizeStoreDomain } from './client'
import { menuItemPath } from './pages'

/**
 * Derive the fixture host the same way `isStoreHost` does, so these cases
 * stay correct whether or not SHOPIFY_STORE_DOMAIN is configured in the
 * environment running the tests. Hardcoding a host would fail the moment a
 * developer has a real store domain in .env.local.
 */
const storeOrigin = normalizeStoreDomain(env.SHOPIFY_STORE_DOMAIN)
const STORE_HOST = storeOrigin
  ? new URL(storeOrigin).host
  : 'your-store.myshopify.com'
const storeUrl = (path: string) => `https://${STORE_HOST}${path}`

describe('menuItemPath', () => {
  test.each([
    [
      'a product handle containing "pages" as a substring is not corrupted',
      storeUrl('/products/pages-and-things'),
      '/products/pages-and-things',
    ],
    [
      '/collections is remapped to /search',
      storeUrl('/collections/x'),
      '/search/x',
    ],
    [
      'a leading /pages/ segment is stripped',
      storeUrl('/pages/about'),
      '/about',
    ],
    [
      'a root-relative input is remapped without needing a host',
      '/collections/root-relative',
      '/search/root-relative',
    ],
    [
      'an external absolute URL is returned unchanged, not collapsed to a dead local route',
      'https://instagram.com/foo',
      'https://instagram.com/foo',
    ],
    [
      'a hash fragment on a store URL is preserved',
      storeUrl('/collections/x#section'),
      '/search/x#section',
    ],
  ])('%s', (_label, input, expected) => {
    expect(menuItemPath(input)).toBe(expected)
  })

  test('a substring match deeper than the leading segment is not remapped', () => {
    // "/collections" only inside a query string / later segment must not be
    // rewritten — only a *leading* /collections or /pages/ segment counts.
    expect(menuItemPath(storeUrl('/products/my-collections'))).toBe(
      '/products/my-collections'
    )
  })

  test('an unparseable / relative-looking value passes through the remap unchanged when it does not start with /collections or /pages/', () => {
    expect(menuItemPath('/about')).toBe('/about')
  })

  test('another shop on the same platform is external, not local', () => {
    // With a store domain configured, only that exact host is local. Without
    // one, isStoreHost falls back to treating any *.myshopify.com host as the
    // store, so this documents the fallback rather than the configured path.
    const other = 'https://a-different-shop.myshopify.com/products/thing'
    expect(menuItemPath(other)).toBe(storeOrigin ? other : '/products/thing')
  })
})
