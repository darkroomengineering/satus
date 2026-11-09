import {
  buildAgentGuidanceMarkdown,
  buildCmsRoutesMarkdown,
  buildDeveloperResourcesMarkdown,
  buildStaticRoutesMarkdown,
} from '@/lib/seo/agent-content'
import { mergeVary } from '@/lib/seo/content-negotiation'
import { getCmsRoutes } from '@/lib/seo/routes'
import { formatList, SITE } from '@/lib/seo/site'

/**
 * `/llms.txt`: a plain-text site summary for LLMs, in the emerging convention.
 * The entity section comes from `lib/seo/site.ts` and the page list from
 * `getCmsRoutes()` (shared with `app/sitemap.ts`), so neither drifts from the
 * JSON-LD graph, on-page copy or sitemap.
 *
 * Prerendered at build time (GET handlers are dynamic unless they opt in).
 * The Sanity read behind `getCmsRoutes()` carries the `sanity` tag, so the
 * publish webhook regenerates this file too. Cost: `force-static` makes
 * request APIs (`headers()`, `cookies()`) return empty, so this handler can
 * never vary by request.
 */
export const dynamic = 'force-static'

/** The About section, or `''` when `lib/seo/site.ts` sets none of its facts. */
function buildAbout(): string {
  const clauses: string[] = []

  if (SITE.foundingDate) clauses.push(`Founded in ${SITE.foundingDate}.`)
  if (SITE.locationName) clauses.push(`Based in ${SITE.locationName}.`)
  if (SITE.services.length)
    clauses.push(`Services: ${formatList(SITE.services)}.`)
  if (SITE.knowsAbout.length)
    clauses.push(`Areas of expertise: ${formatList(SITE.knowsAbout)}.`)

  if (clauses.length === 0) return ''

  return `## About\n\n${clauses.join(' ')}\n\n`
}

async function buildBody(): Promise<string> {
  const cmsRoutes = await getCmsRoutes()

  return `# ${SITE.name}

> ${SITE.description}

${buildAbout()}## Key pages

${buildStaticRoutesMarkdown()}${buildCmsRoutesMarkdown(cmsRoutes)}${buildAgentGuidanceMarkdown()}${buildDeveloperResourcesMarkdown()}
`
}

export async function GET() {
  const body = await buildBody()
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      vary: mergeVary(null, 'Accept'),
    },
  })
}
