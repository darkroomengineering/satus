import { z } from 'zod'

import { assertServerEnvironment } from '@/utils/assert-server-environment'

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
  // Password gate (proxy.ts). Set: every deployment except `next dev` asks
  // for it through HTTP Basic auth. Unset: the site is public. An empty value
  // fails here rather than leaving the site open while looking gated.
  SITE_PASSWORD: z.string().min(1).optional(),
  // Server error reporting (instrumentation.ts). Every server error is logged
  // either way; set the URL and each one is also POSTed there as JSON, with
  // the token, when set, as `Authorization: Bearer`. A malformed URL fails
  // here instead of dropping every report.
  ERROR_REPORT_URL: z.url().optional(),
  ERROR_REPORT_TOKEN: z.string().min(1).optional(),

  // Sanity (supports both Satus and Vercel Marketplace conventions)
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_SANITY_DATASET: z.string().optional(),
  // Validated so a malformed value fails at startup. Not consumed by
  // lib/integrations/sanity/env.ts, which reads process.env directly to stay
  // client-bundle-safe for the Studio route (see its caveat).
  NEXT_PUBLIC_SANITY_API_VERSION: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      error: 'NEXT_PUBLIC_SANITY_API_VERSION must be in YYYY-MM-DD format',
    })
    .optional(),
  // Viewer token for draft mode (Presentation), server only. Never give it a
  // NEXT_PUBLIC_ name: that inlines it into the browser bundle.
  SANITY_API_READ_TOKEN: z.string().optional(),
  // Sanity CLI's own name for the project ID, so a project from `sanity init`
  // isn't treated as unconfigured.
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

assertServerEnvironment('@/lib/env')

/**
 * dotenvx leaves a value it cannot decrypt (no private key on this machine)
 * as its `encrypted:` ciphertext rather than unsetting it, and only logs.
 * Every committed value is encrypted, so that means the whole config is
 * missing: an integration would call its API with ciphertext and a
 * NEXT_PUBLIC_* value would be inlined into the browser bundle as ciphertext.
 * Cost: nothing runs without the key. CI is not an exception in code: it
 * holds no key and deletes the encrypted files before building (ci.yml).
 */
const undecrypted = Object.entries(process.env)
  .filter(([, value]) => value?.startsWith('encrypted:'))
  .map(([key]) => key)

if (undecrypted.length > 0) {
  throw new Error(
    `[env] Could not decrypt ${undecrypted.join(', ')}: no dotenvx private key ` +
      'for this environment (DOTENV_PRIVATE_KEY for .env, plus ' +
      'DOTENV_PRIVATE_KEY_<ENVIRONMENT> for an override file). Locally, add it to ' +
      '.env.keys; on Vercel, run `bun run env:setup`. See README § Environment variables.'
  )
}

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

// Every field is optional: integrations check their own requirements through
// the registry's `isConfigured()`.
export const env: Env = parsedEnv.data

/**
 * Canonical base URL. NEXT_PUBLIC_BASE_URL wins; on Vercel it is usually
 * unset, so production uses VERCEL_PROJECT_PRODUCTION_URL and a preview its
 * own branch URL (previews stay out of search via Vercel's
 * `x-robots-tag: noindex`).
 *
 * Costs: Vercel picks the shortest production custom domain, so a site on
 * `www.example.com` with the apex redirecting to it gets the apex; set
 * NEXT_PUBLIC_BASE_URL there. With deployment protection on for previews,
 * link unfurlers get the login page instead of the OG image. A production
 * build with none of these resolves canonical URLs, sitemaps and OG images to
 * `https://localhost:3000`.
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
