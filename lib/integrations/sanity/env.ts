/**
 * Sanity Environment Configuration
 *
 * All values have safe defaults to allow the app to build and run
 * without Sanity configured. Use isSanityConfigured() to check
 * if Sanity is properly set up before making API calls.
 */

/** Sanity API version - defaults to latest stable */
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-03-15'

/** Sanity dataset name - defaults to 'production' */
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

/** Sanity project ID - empty string if not configured */
export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  ''

/** Sanity Studio URL for visual editing */
export const studioUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/studio'
    : `${process.env.NEXT_PUBLIC_BASE_URL || ''}/studio`

/** Public read token for client-side queries */
export const publicToken = process.env.NEXT_PUBLIC_SANITY_API_READ_TOKEN || ''

/** Private token for server-side mutations (optional) */
export const privateToken = process.env.SANITY_PRIVATE_TOKEN || ''

/** Preview URL for draft mode */
export const previewURL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_BASE_URL || ''
