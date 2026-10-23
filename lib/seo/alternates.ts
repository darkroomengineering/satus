import type { Metadata } from 'next'

import { markdownPathForRoute } from '@/lib/seo/markdown-path'
import { STATIC_ROUTES } from '@/lib/seo/route-catalog'

/**
 * Builds the `alternates` block for one route.
 *
 * Next.js merges metadata shallowly: a child that declares its own
 * `alternates` replaces the parent's whole object, so a page setting only
 * `canonical: '/ai'` also drops the `/llms.txt` link (and `/ai` most needs
 * it). Route every page through this helper to keep the shared entries.
 *
 * `path` must be the URL `app/sitemap.ts` submits; a canonical that
 * disagrees asks engines to crawl one URL and index another. Pass a
 * root-relative path (`/articles/foo`); Next resolves it against
 * `metadataBase`.
 */
export function routeAlternates(path: string): Metadata['alternates'] {
  const hasMarkdownRepresentation = STATIC_ROUTES.some(
    (route) => route.path === path
  )

  return {
    // Self-referential: a hardcoded layout canonical is inherited by every
    // child, telling engines the whole site is one duplicated page.
    canonical: path,
    types: {
      'text/plain': [{ url: '/llms.txt', title: 'llms.txt' }],
      ...(hasMarkdownRepresentation && {
        'text/markdown': [
          {
            url: markdownPathForRoute(path),
            title: `${path === '/' ? 'Home' : path} as Markdown`,
          },
        ],
      }),
    },
  }
}
