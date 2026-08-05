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

import { menuItemPath } from './pages'

describe('menuItemPath', () => {
  test.each([
    [
      'a product handle containing "pages" as a substring is not corrupted',
      'https://your-store.myshopify.com/products/pages-and-things',
      '/products/pages-and-things',
    ],
    [
      '/collections is remapped to /search',
      'https://your-store.myshopify.com/collections/x',
      '/search/x',
    ],
    [
      'a leading /pages/ segment is stripped',
      'https://your-store.myshopify.com/pages/about',
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
      'https://your-store.myshopify.com/collections/x#section',
      '/search/x#section',
    ],
  ])('%s', (_label, input, expected) => {
    expect(menuItemPath(input)).toBe(expected)
  })

  test('a substring match deeper than the leading segment is not remapped', () => {
    // "/collections" only inside a query string / later segment must not be
    // rewritten — only a *leading* /collections or /pages/ segment counts.
    expect(
      menuItemPath('https://your-store.myshopify.com/products/my-collections')
    ).toBe('/products/my-collections')
  })

  test('an unparseable / relative-looking value passes through the remap unchanged when it does not start with /collections or /pages/', () => {
    expect(menuItemPath('/about')).toBe('/about')
  })
})
