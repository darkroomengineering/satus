/**
 * Sanity Environment Configuration
 *
 * PUBLIC_ prefixed vars are exposed to client via Vite's envPrefix config.
 * Non-prefixed vars are server-only.
 */

export const apiVersion = process.env.PUBLIC_SANITY_API_VERSION || '2025-10-30'

export const dataset = process.env.PUBLIC_SANITY_DATASET || 'production'

export const projectId = process.env.PUBLIC_SANITY_PROJECT_ID || ''

export const studioUrl =
  process.env.PUBLIC_SANITY_STUDIO_URL || 'http://localhost:5173/studio'

export const readToken = process.env.SANITY_API_READ_TOKEN || ''
