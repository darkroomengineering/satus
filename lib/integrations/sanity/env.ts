// Dual-compiled: `sanity.config.ts` reaches the client bundle through
// `app/studio/[[...tool]]/studio.tsx`. So this module reads literal
// `process.env.NEXT_PUBLIC_X` expressions (statically inlinable) and must not
// import `@/lib/env`, which parses the whole `process.env` object. Defaults
// let the app build without Sanity configured.

/**
 * Pinned API version. Format is validated by `lib/env.ts` wherever `env` is
 * imported server-side.
 */
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2025-03-01'

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

/** Empty string when not configured. */
export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??
  process.env.SANITY_STUDIO_PROJECT_ID ??
  ''

export const studioUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/studio'
    : `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/studio`

export const previewURL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : (process.env.NEXT_PUBLIC_BASE_URL ?? '')
