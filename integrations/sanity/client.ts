import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, dataset, projectId, studioUrl } from './env'

let _client: SanityClient | null = null

/**
 * Sanity client for public queries (CDN-backed)
 * Lazily created — returns null if projectId is not configured
 */
export function getClient(): SanityClient {
  if (!projectId) {
    throw new Error(
      'Sanity is not configured. Set SANITY_PROJECT_ID in your .env'
    )
  }
  if (!_client) {
    _client = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
      stega: { studioUrl },
    })
  }
  return _client
}
