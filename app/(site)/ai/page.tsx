import type { Metadata } from 'next'

import { routeAlternates } from '@/lib/seo/alternates'
import { getCmsRoutes, STATIC_ROUTES } from '@/lib/seo/routes'
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
 * Reads the same `lib/seo/route-catalog` STATIC_ROUTES catalog that
 * `app/sitemap.ts` and `/llms.txt` do — the single source those surfaces
 * share, so none of them can drift from the others.
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
  alternates: routeAlternates('/ai'),
}

export default async function AiPage() {
  const cmsRoutes = await getCmsRoutes()

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
        {STATIC_ROUTES.map((page) => (
          <li key={page.path}>
            {/* oxlint-disable-next-line react/forbid-elements -- this route is intentionally client-component-free; the Link component is 'use client', so a bare anchor keeps the whole page server-only (see file header) */}
            <a href={page.path}>{page.label}</a>: {page.description}
          </li>
        ))}
        {cmsRoutes.map((page) => (
          <li key={page.path}>
            {/* oxlint-disable-next-line react/forbid-elements -- this route is intentionally client-component-free; the Link component is 'use client', so a bare anchor keeps the whole page server-only (see file header) */}
            <a href={page.path}>{page.label}</a>
          </li>
        ))}
      </ul>

      {SITE.agentGuidance?.whenToUse.length ? (
        <>
          <h2>When to use</h2>
          <ul>
            {SITE.agentGuidance.whenToUse.map((useCase) => (
              <li key={useCase.name}>
                <strong>{useCase.name}:</strong> {useCase.description}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {SITE.agentGuidance?.howToUse.length ? (
        <>
          <h2>How to use</h2>
          <ol>
            {SITE.agentGuidance.howToUse.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </>
      ) : null}

      {SITE.developerResources?.length ? (
        <>
          <h2>Developer resources</h2>
          <ul>
            {SITE.developerResources.map((resource) => (
              <li key={resource.url}>
                {/* oxlint-disable-next-line react/forbid-elements -- external link, and this route is intentionally client-component-free (see file header) */}
                <a href={resource.url}>{resource.name}</a>:{' '}
                {resource.description}
              </li>
            ))}
          </ul>
        </>
      ) : null}

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
