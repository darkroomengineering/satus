/**
 * Sanity Environment Configuration
 *
 * Reads from NEXT_PUBLIC_ prefixed vars for backward compatibility
 * with existing .env.local files.
 */

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-10-30'

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  ''

export const studioUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173/studio'
    : `${process.env.NEXT_PUBLIC_BASE_URL || ''}/studio`

export const readToken =
  process.env.NEXT_PUBLIC_SANITY_API_READ_TOKEN ||
  process.env.SANITY_API_READ_TOKEN ||
  ''
