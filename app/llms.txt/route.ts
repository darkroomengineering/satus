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
 * `/llms.txt` — the emerging convention for giving LLMs a plain-text site
 * summary they can fetch without executing JS or parsing HTML.
 *
 * This is the cheapest possible AEO (answer-engine optimization) win: one
 * static endpoint that states the entity in the format crawlers already
 * expect. The entity section is generated from `lib/seo/site.ts` rather
 * than hand-written so it can never drift from the JSON-LD graph or
 * on-page copy; the content list is generated from the same
 * `getCmsRoutes()` that feeds `app/sitemap.ts`, so both surfaces describe
 * the same set of pages.
 *
 * No `export const dynamic = 'force-static'` here — this project runs
 * Next's Cache Components (`cacheComponents: true`), which forbids the
 * classic route segment config. `'use cache'` on the body builder is the
 * Cache Components equivalent. It has to wrap the plain-string builder
 * rather than the handler itself: a `'use cache'` boundary serializes its
 * return value, and a `Response` instance is not a plain object.
 */

function buildAbout(): string {
  const clauses: string[] = []

  if (SITE.foundingDate) clauses.push(`Founded in ${SITE.foundingDate}.`)
  if (SITE.locationName) clauses.push(`Based in ${SITE.locationName}.`)
  if (SITE.services.length)
    clauses.push(`Services: ${formatList(SITE.services)}.`)
  if (SITE.knowsAbout.length)
    clauses.push(`Areas of expertise: ${formatList(SITE.knowsAbout)}.`)

  // Fresh clone: no optional SITE fields are set yet. Say so plainly instead
  // of emitting an empty section or a sentence with a hole in it.
  if (clauses.length === 0) {
    return `No additional facts configured yet — populate lib/seo/site.ts.`
  }

  return clauses.join(' ')
}

async function buildBody(): Promise<string> {
  'use cache'
  const cmsRoutes = await getCmsRoutes()

  return `# ${SITE.name}

> ${SITE.description}

## About

${buildAbout()}

## Key pages

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
