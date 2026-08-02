import type { Metadata } from 'next'

import { formatList, SITE } from '@/lib/seo/site'

/**
 * `/ai` — a plain-HTML index of the site for LLM agents and crawlers.
 *
 * Visual-first sites (WebGL canvases, animated layouts, client-rendered
 * copy) give answer engines almost nothing to cite, and JS-heavy pages give
 * non-executing crawlers even less. One plain-HTML route that names the
 * entity and links every page is the highest-leverage AEO surface a site
 * can ship — cheaper than structured data, cheaper than a CMS migration.
 *
 * It is intentionally ugly: this is a data surface, not a designed page.
 * Real semantic elements only (`h1`/`h2`/`dl`/`ul`/`a[href]`) so it reads
 * the same whether it's parsed by a browser, a crawler, or an LLM's HTML
 * parser tool.
 *
 * Must stay in sync with `app/sitemap.ts` — a route missing from either is
 * invisible to the surface it's missing from.
 *
 * `Link` (`@/components/ui/link`) is a `'use client'` component (it reads
 * `usePathname` for active-link state and `useSyncExternalStore` for
 * prefetch hints). This route intentionally carries zero client
 * components, so internal/external links below are bare `<a href>`
 * elements rather than `Link` — the rendered markup is identical either
 * way, but this keeps the whole route server-only end to end.
 */

export const metadata: Metadata = {
  title: 'Machine view',
  description: `Plain-text index of ${SITE.name} for AI agents and crawlers.`,
  alternates: {
    canonical: '/ai',
  },
}

/**
 * Every route the machine view links to. Satus ships one page today — add
 * an entry here (and to `app/sitemap.ts`) for every route the project adds.
 */
const PAGES = [
  {
    href: '/',
    label: 'Home',
    description: SITE.description,
  },
]

export default function AiPage() {
  return (
    <>
      <h1>{SITE.name}</h1>
      <p>{SITE.description}</p>

      <h2>Facts</h2>
      <dl>
        {SITE.foundingDate && (
          <>
            <dt>Founded</dt>
            <dd>{SITE.foundingDate}</dd>
          </>
        )}
        {SITE.locationName && (
          <>
            <dt>Location</dt>
            <dd>{SITE.locationName}</dd>
          </>
        )}
        {SITE.areaServed && (
          <>
            <dt>Area served</dt>
            <dd>{SITE.areaServed}</dd>
          </>
        )}
        {SITE.email && (
          <>
            <dt>Email</dt>
            <dd>{SITE.email}</dd>
          </>
        )}
        {SITE.services.length > 0 && (
          <>
            <dt>Services</dt>
            <dd>{formatList(SITE.services)}</dd>
          </>
        )}
        {SITE.knowsAbout.length > 0 && (
          <>
            <dt>Expertise</dt>
            <dd>{formatList(SITE.knowsAbout)}</dd>
          </>
        )}
      </dl>

      <h2>Pages</h2>
      <ul>
        {PAGES.map((page) => (
          <li key={page.href}>
            {/* oxlint-disable-next-line react/forbid-elements -- this route is intentionally client-component-free; the Link component is 'use client', so a bare anchor keeps the whole page server-only (see file header) */}
            <a href={page.href}>{page.label}</a>: {page.description}
          </li>
        ))}
      </ul>

      {SITE.sameAs.length > 0 && (
        <>
          <h2>Elsewhere</h2>
          <ul>
            {SITE.sameAs.map((url) => (
              <li key={url}>
                {/* oxlint-disable-next-line react/forbid-elements -- external link, and this route is intentionally client-component-free (see file header) */}
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>For agents</h2>
      <ul>
        <li>
          {/* oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- non-page static route; this route is intentionally client-component-free (see file header) */}
          <a href="/llms.txt">/llms.txt</a>
        </li>
        <li>
          {/* oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- non-page static route; this route is intentionally client-component-free (see file header) */}
          <a href="/sitemap.xml">/sitemap.xml</a>
        </li>
        <li>
          {/* oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- non-page static route; this route is intentionally client-component-free (see file header) */}
          <a href="/robots.txt">/robots.txt</a>
        </li>
      </ul>
    </>
  )
}
