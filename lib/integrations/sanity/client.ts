import { createClient, type SanityClient } from 'next-sanity'

import { isConfigured } from '@/integrations/registry'

import { apiVersion, dataset, projectId, studioUrl } from './env'

/**
 * Sanity client instance. `null` until Sanity is configured; read through
 * `sanityFetch` (`./fetch`), never directly.
 *
 * The base client has no token and reads the live API, not the API CDN: we
 * cache content ourselves (`published.ts`) and refetch right after the
 * publish webhook expires the `sanity` tag, and a CDN response still stale at
 * that moment would be cached until the next publish. Cost: every cache miss
 * hits the live API, which Sanity meters separately from the API CDN with a
 * smaller included quota (check your plan). The Next cache is per region or
 * instance, so each publish triggers one miss per page per region or
 * instance. Draft mode adds the Viewer token and stega per request in
 * `fetch.ts`.
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
