import { createClient, type SanityClient } from 'next-sanity'
import { isSanityConfigured } from '@/integrations/check-integration'
import { apiVersion, dataset, privateToken, projectId, studioUrl } from './env'

/**
 * Sanity client instance
 *
 * Returns null if Sanity is not configured (missing env vars).
 * Always check with isSanityConfigured() before using.
 */
export const client: SanityClient | null = isSanityConfigured()
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      perspective: 'published',
      token: privateToken,
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
