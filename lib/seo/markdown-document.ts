import {
  absoluteSiteUrl,
  buildAgentGuidanceMarkdown,
  buildCmsRoutesMarkdown,
  buildDeveloperResourcesMarkdown,
  buildStaticRoutesMarkdown,
} from '@/lib/seo/agent-content'
import {
  HTML_FORMAT_OVERRIDE_PARAM,
  HTML_FORMAT_OVERRIDE_VALUE,
} from '@/lib/seo/content-negotiation'
import { STATIC_ROUTES } from '@/lib/seo/route-catalog'
import type { ContentRoute } from '@/lib/seo/routes'
import { getCmsRoutesResult } from '@/lib/seo/routes'
import { SITE } from '@/lib/seo/site'

/**
 * `303` carries only a location (the client's Accept header also allows HTML,
 * so redirect instead of explaining a 406). `503` is a CMS outage: absence
 * can't be confirmed. Both are distinct types so a caller can't read
 * `contentType`/`body` off a redirect.
 */
export type MarkdownDocument =
  | {
      status: 200 | 404 | 406
      contentType: 'text/markdown; charset=utf-8' | 'text/plain; charset=utf-8'
      body: string
    }
  | {
      status: 503
      contentType: 'text/plain; charset=utf-8'
      body: string
      retryAfterSeconds: number
    }
  | {
      status: 303
      location: string
    }

interface BuildMarkdownDocumentOptions {
  /** Whether the requesting client's Accept header also permits text/html. */
  htmlAcceptable?: boolean
  /**
   * Original query string with its leading `?` (or `''`), preserved through
   * the proxy rewrite so the 303 merges `format=html` into it instead of
   * dropping params like `?variant=x`.
   */
  search?: string
}

function normalizeRoutePath(path: string): string {
  if (path === '/') return path
  return path.replace(/\/$/, '')
}

function buildMarkdownNotFound(path: string): MarkdownDocument {
  return {
    status: 404,
    contentType: 'text/markdown; charset=utf-8',
    body: `# 404: Markdown page not found

No Markdown representation is available for \`${path}\`. The starter currently provides Markdown for its static route catalog; CMS-authored pages remain available as HTML.

## Where to look next

- [Agent index](${absoluteSiteUrl('/ai')})
- [llms.txt](${absoluteSiteUrl('/llms.txt')})
- [Sitemap](${absoluteSiteUrl('/sitemap.xml')})
`,
  }
}

/**
 * An outage and a nonexistent route both leave `path` unmatched, but only the
 * outage resolves itself; a retry hint stops crawlers learning the URL 404s.
 */
function buildMarkdownDegraded(path: string): MarkdownDocument {
  return {
    status: 503,
    contentType: 'text/plain; charset=utf-8',
    retryAfterSeconds: 60,
    body: `Markdown catalog temporarily unavailable while checking \`${path}\`. This is a transient content-source outage, not a confirmation the page doesn't exist — retry shortly, or request text/html for the live page.\n`,
  }
}

function htmlOverrideUrl(path: string, search: string): string {
  const params = new URLSearchParams(search)
  params.set(HTML_FORMAT_OVERRIDE_PARAM, HTML_FORMAT_OVERRIDE_VALUE)
  return `${path}?${params.toString()}`
}

function buildMarkdownUnavailable(
  path: string,
  label: string,
  htmlAcceptable: boolean,
  search: string
): MarkdownDocument {
  // RFC 9110 allows a 406 only when no available representation is
  // acceptable, and HTML is available here.
  if (htmlAcceptable) {
    return { status: 303, location: htmlOverrideUrl(path, search) }
  }

  const htmlUrl = absoluteSiteUrl(path)

  return {
    status: 406,
    contentType: 'text/plain; charset=utf-8',
    body: `${label} exists as an HTML page at ${htmlUrl}, but it does not have a Markdown representation yet. Request text/html or follow the canonical HTML URL.\n`,
  }
}

export function buildMarkdownDocumentFromRoutes(
  requestedPath: string,
  cmsRoutes: readonly ContentRoute[],
  options: BuildMarkdownDocumentOptions & { catalogDegraded?: boolean } = {}
): MarkdownDocument {
  const {
    htmlAcceptable = true,
    catalogDegraded = false,
    search = '',
  } = options
  const path = normalizeRoutePath(requestedPath)
  const route = STATIC_ROUTES.find((candidate) => candidate.path === path)
  if (!route) {
    const cmsRoute = cmsRoutes.find((candidate) => candidate.path === path)
    if (cmsRoute) {
      return buildMarkdownUnavailable(
        cmsRoute.path,
        cmsRoute.label,
        htmlAcceptable,
        search
      )
    }
    // A degraded catalog can't confirm absence. Static routes never depend on
    // the CMS fetch, so they are unaffected.
    return catalogDegraded
      ? buildMarkdownDegraded(path)
      : buildMarkdownNotFound(path)
  }

  return {
    status: 200,
    contentType: 'text/markdown; charset=utf-8',
    body: `# ${route.label} | ${SITE.name}

> ${SITE.description}

## This page

${route.description}

This representation summarizes the starter-owned route. It lists CMS pages for discovery but does not claim to reproduce their article bodies.

## Pages

${buildStaticRoutesMarkdown()}${buildCmsRoutesMarkdown(cmsRoutes)}${buildAgentGuidanceMarkdown()}${buildDeveloperResourcesMarkdown()}

## Agent files

- [llms.txt](${absoluteSiteUrl('/llms.txt')})
- [Sitemap](${absoluteSiteUrl('/sitemap.xml')})
- [Robots policy](${absoluteSiteUrl('/robots.txt')})
`,
  }
}

export async function buildMarkdownDocument(
  requestedPath: string,
  options: BuildMarkdownDocumentOptions = {}
): Promise<MarkdownDocument> {
  const { routes, degraded } = await getCmsRoutesResult()
  return buildMarkdownDocumentFromRoutes(requestedPath, routes, {
    ...(options.htmlAcceptable !== undefined && {
      htmlAcceptable: options.htmlAcceptable,
    }),
    ...(options.search !== undefined && { search: options.search }),
    catalogDegraded: degraded,
  })
}
