/**
 * Sanity Environment Configuration
 *
 * All values have safe defaults to allow the app to build and run
 * without Sanity configured.
 */

export const apiVersion = process.env.SANITY_API_VERSION || '2025-10-30'

export const dataset = process.env.SANITY_DATASET || 'production'

export const projectId = process.env.SANITY_PROJECT_ID || ''

export const studioUrl =
  process.env.SANITY_STUDIO_URL || 'http://localhost:5173/studio'

export const readToken = process.env.SANITY_API_READ_TOKEN || ''

export function isSanityConfigured(): boolean {
  return Boolean(projectId && dataset)
}
