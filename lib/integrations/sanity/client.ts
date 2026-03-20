import { createClient, type SanityClient } from 'next-sanity'
import { isSanityConfigured } from '@/integrations/check-integration'
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
export const client: SanityClient | null = isSanityConfigured()
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
