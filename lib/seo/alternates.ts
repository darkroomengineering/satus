import type { Metadata } from 'next'

import { markdownPathForRoute } from '@/lib/seo/markdown-path'
import { STATIC_ROUTES } from '@/lib/seo/route-catalog'

/**
 * Alternates that hold on every page, including noindex ones: the `/llms.txt`
 * link. `app/(site)/layout.tsx` sets only these, so a route that declares no
 * `alternates` inherits no canonical.
 */
export const SITE_ALTERNATE_TYPES = {
  'text/plain': [{ url: '/llms.txt', title: 'llms.txt' }],
} satisfies NonNullable<Metadata['alternates']>['types']

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
 *
 * Only `STATIC_ROUTES` advertise a `text/markdown` alternate. CMS routes have
 * no Markdown body (negotiation answers 303 or 406, see
 * `markdown-document.ts`), so a link would send crawlers to a 406.
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
      ...SITE_ALTERNATE_TYPES,
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
