/**
 * Sanity Environment Configuration
 *
 * PUBLIC_ prefixed vars use import.meta.env (available client + server in Vite).
 */

export const apiVersion =
  import.meta.env.PUBLIC_SANITY_API_VERSION || '2025-10-30'

export const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production'

export const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || ''

export const studioUrl =
  import.meta.env.PUBLIC_SANITY_STUDIO_URL || 'http://localhost:5173/studio'
