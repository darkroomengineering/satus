import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId, studioUrl } from './env'

/**
 * Sanity client for public queries (CDN-backed)
 * Only created if projectId is configured
 */
export const client = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      stega: { studioUrl },
    })
  : null
