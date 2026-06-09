import { z } from 'zod'

/**
 * Typed Environment Variables
 *
 * Provides validated, type-safe access to environment variables.
 * Import `env` instead of using `process.env` directly for type safety.
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env'
 *
 * // Type-safe access with IntelliSense
 * const url = env.NEXT_PUBLIC_BASE_URL // string | undefined
 * const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID // string | undefined
 * ```
 */

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  NEXT_PUBLIC_BASE_URL: z.url().optional(),

  // Sanity (supports both Satus and Vercel Marketplace conventions)
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_SANITY_DATASET: z.string().optional(),
  // Public read token; NEXT_PUBLIC_ variant supports Vercel Marketplace installs
  NEXT_PUBLIC_SANITY_API_READ_TOKEN: z.string().optional(),
  // Server-side fallback read token (non-NEXT_PUBLIC_ variant for Vercel Marketplace)
  SANITY_API_READ_TOKEN: z.string().optional(),
  // Private server-side token for mutations (Satus convention)
  SANITY_PRIVATE_TOKEN: z.string().optional(),
  // Alias for SANITY_PRIVATE_TOKEN used by Vercel Marketplace provisioning
  SANITY_API_WRITE_TOKEN: z.string().optional(),
  // Vercel Marketplace may provision project ID under this name (Studio convention)
  SANITY_STUDIO_PROJECT_ID: z.string().optional(),
  // Webhook secret for on-demand revalidation (app/api/revalidate)
  SANITY_REVALIDATE_SECRET: z.string().optional(),

  // Shopify
  SHOPIFY_STORE_DOMAIN: z.string().optional(),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_REVALIDATION_SECRET: z.string().optional(),

  // HubSpot
  HUBSPOT_ACCESS_TOKEN: z.string().optional(),
  NEXT_PUBLIC_HUBSPOT_PORTAL_ID: z.string().optional(),

  // Mailchimp
  MAILCHIMP_API_KEY: z.string().optional(),
  MAILCHIMP_SERVER_PREFIX: z.string().optional(),
  MAILCHIMP_AUDIENCE_ID: z.string().optional(),

  // Turnstile
  NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: z.string().optional(),
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_GOOGLE_ANALYTICS: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z.string().optional(),
  NEXT_PUBLIC_FACEBOOK_APP_ID: z.string().optional(),
})

type Env = z.infer<typeof envSchema>

/**
 * Validated environment variables with full TypeScript IntelliSense.
 *
 * All fields are optional -- integrations check their own requirements
 * via the registry's `isConfigured()`. This object provides type-safe access
 * without runtime validation overhead (parsing happens once at import).
 */
export const env: Env = envSchema.parse(process.env)

/**
 * Canonical base URL for the application.
 *
 * Falls back to `https://localhost:3000` for local development (the dev server
 * supports --https mode). In production, NEXT_PUBLIC_BASE_URL must be set —
 * omitting it causes all canonical URLs, sitemaps, and OG images to resolve
 * to localhost, breaking SEO entirely.
 */
export const APP_BASE_URL = env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_BASE_URL
) {
  console.warn(
    '[env] NEXT_PUBLIC_BASE_URL is not set in production. ' +
      'Canonical URLs, sitemaps, and OG image paths will resolve to localhost, ' +
      'which harms SEO. Set NEXT_PUBLIC_BASE_URL to your production domain.'
  )
}
