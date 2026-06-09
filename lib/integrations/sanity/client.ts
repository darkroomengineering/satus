// USAGE — Sanity CMS
// 1. Set env vars: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
//    NEXT_PUBLIC_SANITY_API_READ_TOKEN, SANITY_API_READ_TOKEN
// 2. Define schemas in lib/integrations/sanity/schemas/ and register them in schemas/index.ts
// 3. Fetch data in a Server Component page:
//
//   import { sanityFetch } from '@/integrations/sanity/live'
//   import { pageQuery } from '@/integrations/sanity/queries'
//
//   export default async function Page() {
//     'use cache'
//     const { data } = await sanityFetch({ query: pageQuery, params: { slug: 'home' } })
//     return <MyContent data={data} />
//   }
//
// 4. Add `<SanityLive />` to your root layout for real-time preview mode.
//
// 5. To re-add the Sanity Studio route (/studio), create:
//    app/studio/layout.tsx  — disables draft mode on enter (see studio/layout.tsx)
//    app/studio/[[...tool]]/page.tsx:
//      'use client'
//      import { NextStudio } from 'next-sanity/studio'
//      import config from '@/integrations/sanity/sanity.config'
//      export default function StudioPage() { return <NextStudio config={config} /> }
//
// Full walkthrough: see the manual (app/page.tsx) step 5 "Add a plugin".

import { createClient, type SanityClient } from 'next-sanity'
import { isConfigured } from '@/integrations/registry'
import { apiVersion, dataset, projectId, studioUrl } from './env'

/**
 * Sanity client instance
 *
 * Returns null if Sanity is not configured (missing env vars).
 * Always check with isSanityConfigured() before using.
 *
 * Note: next-sanity uses fetch internally with Next.js caching.
 * Deduplication is automatic - no need for React.cache() wrapper.
 *
 * The base client has no token — it uses the public CDN for published content.
 * Token is applied where needed via client.withConfig({ token }) for
 * draft mode, revalidation, or server-side mutations.
 */
export const client: SanityClient | null = isConfigured('sanity')
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
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
