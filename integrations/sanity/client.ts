import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId, studioUrl } from './env'

/**
 * Sanity client for public queries (CDN-backed)
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  stega: {
    studioUrl,
  },
})
