// USAGE — Sanity CMS
// 1. Set env vars: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET.
//    For draft mode and the publish webhook, also SANITY_API_READ_TOKEN (a
//    Viewer token, server only) and SANITY_REVALIDATE_SECRET.
// 2. Define schemas in lib/integrations/sanity/schemas/ and register them in schemas/index.ts
// 3. Fetch data in a Server Component page:
//
//   import { sanityFetch } from '@/integrations/sanity/fetch'
//   import { pageQuery } from '@/integrations/sanity/queries'
//
//   export default async function Page() {
//     const data = await sanityFetch({ query: pageQuery, params: { slug: 'home' } })
//     return <MyContent data={data} />
//   }
//
// 4. Point a Sanity webhook at /api/revalidate (see README.md § Revalidation).
//
// 5. To re-add the Sanity Studio route (/studio), create:
//    app/studio/[[...tool]]/page.tsx — a server page that exports noindex
//      `metadata` and next-sanity's `viewport`, prerenders through
//      `export const dynamic = 'force-static'`, and renders a `'use client'`
//      wrapper:
//      import { NextStudio } from 'next-sanity/studio'
//      import config from '@/integrations/sanity/sanity.config'
//      export function Studio() { return <NextStudio config={config} /> }
//    It does NOT disable draft mode. The "Disable Draft Mode" affordance is
//    the DisableDraftMode component (lib/integrations/sanity/components/
//    disable-draft-mode.tsx), wired into a page layout outside /studio
//    (see app/(site)/(examples)/sanity/layout.tsx for the pattern).
//
// Full walkthrough: see the manual (app/(site)/page.tsx) step 5 "Add a plugin".

import { createClient, type SanityClient } from 'next-sanity'

import { isConfigured } from '@/integrations/registry'

import { apiVersion, dataset, projectId, studioUrl } from './env'

/**
 * Sanity client instance. `null` until Sanity is configured; read through
 * `sanityFetch` (`./fetch`), never directly.
 *
 * The base client has no token and reads published content from the live
 * API, not the API CDN. We cache content ourselves (`published.ts`) and refetch
 * right after the publish webhook expires the `sanity` tag; a CDN response
 * that is still stale at that moment would be cached again until the next
 * publish. Cost: every cache miss hits the live API. Sanity meters live API
 * requests separately from API CDN requests, with a smaller included quota
 * (check your plan's API vs API CDN request limits), and the Next cache is
 * per region or instance depending on the host, so each publish triggers one
 * miss per page per region or instance, not only on cold paths. Draft mode
 * adds the Viewer token and stega per request in `fetch.ts`.
 */
export const client: SanityClient | null = isConfigured('sanity')
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      perspective: 'published',
      stega: {
        studioUrl,
        filter: (props) => {
          if (props.sourcePath.at(-1) === 'title') {
            return true
          }

          return props.filterDefault(props)
        },
      },
    })
  : null
