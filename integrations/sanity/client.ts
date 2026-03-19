import { createClient } from '@sanity/client'
import { apiVersion, dataset, projectId, readToken, studioUrl } from './env'

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

/**
 * Sanity client with read token for server-side queries
 * Supports draft content and visual editing
 */
export const serverClient = client.withConfig({
  token: readToken,
  useCdn: false,
})
