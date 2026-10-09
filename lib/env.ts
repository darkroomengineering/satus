import { z } from 'zod'

import { assertServerEnvironment } from '@/utils/assert-server-environment'

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
  // Set by Vercel on every deployment, hosts without protocol. The base URL
  // falls back to them: the production domain on production, the branch URL
  // (or the deployment URL, for deploys without git) everywhere else.
  VERCEL_ENV: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),

  // Sanity (supports both Satus and Vercel Marketplace conventions)
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_SANITY_DATASET: z.string().optional(),
  // Sanity API version (YYYY-MM-DD) — validated here so a malformed value
  // fails loudly at startup instead of silently falling back to the
  // hardcoded default in lib/integrations/sanity/env.ts. NOTE: this schema
  // key is not currently consumed by sanity/env.ts, which reads
  // process.env.NEXT_PUBLIC_SANITY_API_VERSION directly to stay client-bundle-safe
  // for the Sanity Studio route (see sanity/env.ts for the caveat).
  NEXT_PUBLIC_SANITY_API_VERSION: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      error: 'NEXT_PUBLIC_SANITY_API_VERSION must be in YYYY-MM-DD format',
    })
    .optional(),
  // Public read token; NEXT_PUBLIC_ variant supports Vercel Marketplace installs
  NEXT_PUBLIC_SANITY_API_READ_TOKEN: z.string().optional(),
  // Server-side fallback read token (non-NEXT_PUBLIC_ variant for Vercel Marketplace)
  SANITY_API_READ_TOKEN: z.string().optional(),
  // Private server-side token for mutations (Satus convention)
  SANITY_PRIVATE_TOKEN: z.string().optional(),
  // Alias for SANITY_PRIVATE_TOKEN used by Vercel Marketplace provisioning
  SANITY_API_WRITE_TOKEN: z.string().optional(),
  // Sanity's own CLI/template convention for the project ID env var name —
  // recognized so a project provisioned by `sanity init` or the CLI
  // template validator isn't treated as unconfigured.
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
  // Opt-in allowlist of form IDs the newsletter action may submit to
  // (comma-separated). Server-only — unset means no restriction.
  HUBSPOT_ALLOWED_FORM_IDS: z.string().optional(),

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
assertServerEnvironment('@/lib/env')

/**
 * dotenvx leaves a value it cannot decrypt (no private key on this machine)
 * as its `encrypted:` ciphertext rather than unsetting it, and only logs.
 * Every committed value is encrypted, so that means the whole config is
 * missing: an integration would call its API with ciphertext and a
 * NEXT_PUBLIC_* value would be inlined into the browser bundle as ciphertext.
 * Cost: nothing runs without the key, CI included (it reads the key from
 * repository secrets).
 */
const undecrypted = Object.entries(process.env)
  .filter(([, value]) => value?.startsWith('encrypted:'))
  .map(([key]) => key)

if (undecrypted.length > 0) {
  throw new Error(
    `[env] Could not decrypt ${undecrypted.join(', ')}: no dotenvx private key ` +
      'for this environment (DOTENV_PRIVATE_KEY for .env, plus ' +
      'DOTENV_PRIVATE_KEY_<ENVIRONMENT> for an override file). Locally, add it to ' +
      '.env.keys; on Vercel and CI, set it as a secret. See README § Environment variables.'
  )
}

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env: Env = parsedEnv.data

/**
 * Canonical base URL for the application.
 *
 * NEXT_PUBLIC_BASE_URL wins when set. On Vercel it is usually left unset:
 * production uses the production domain (VERCEL_PROJECT_PRODUCTION_URL), and a
 * preview uses its own branch URL, so its canonical URLs, sitemap and OG images
 * point at the preview rather than at production. Previews still stay out of
 * search results through the `x-robots-tag: noindex` Vercel sends on them.
 * Locally it falls back to `https://localhost:3000` (the dev server supports
 * --https mode). A production build with none of these resolves canonical
 * URLs, sitemaps, and OG images to localhost, breaking SEO entirely.
 */
const vercelHost =
  env.VERCEL_ENV === 'production'
    ? env.VERCEL_PROJECT_PRODUCTION_URL
    : (env.VERCEL_BRANCH_URL ?? env.VERCEL_URL)

export const APP_BASE_URL =
  env.NEXT_PUBLIC_BASE_URL ??
  (vercelHost ? `https://${vercelHost}` : 'https://localhost:3000')

if (
  process.env.NODE_ENV === 'production' &&
  !env.NEXT_PUBLIC_BASE_URL &&
  !vercelHost
) {
  console.warn(
    '[env] No base URL in production: NEXT_PUBLIC_BASE_URL is unset and this ' +
      'is not a Vercel deployment. Canonical URLs, sitemaps, and OG image ' +
      'paths will resolve to localhost, which harms SEO.'
  )
}
