import { z } from 'zod'
import type { FormState } from '@/components/ui/form/types'

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

/** Email address validated using Zod 4 top-level `z.email()`. */
export const emailSchema = z.email({ error: 'Invalid email address' })

/** Phone number in E.164 format (e.g. +14155552671). */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, { error: 'Invalid phone number (E.164 format)' })

// ---------------------------------------------------------------------------
// Per-integration env schemas
// ---------------------------------------------------------------------------

/** Environment variables required by the Sanity CMS integration. */
export const sanityEnvSchema = z.object({
  NEXT_PUBLIC_SANITY_PROJECT_ID: z
    .string()
    .min(1, { error: 'NEXT_PUBLIC_SANITY_PROJECT_ID is required' }),
  NEXT_PUBLIC_SANITY_DATASET: z
    .string()
    .min(1, { error: 'NEXT_PUBLIC_SANITY_DATASET is required' }),
})

/** Environment variables required by the Shopify Storefront integration. */
export const shopifyEnvSchema = z.object({
  SHOPIFY_STORE_DOMAIN: z
    .string()
    .min(1, { error: 'SHOPIFY_STORE_DOMAIN is required' }),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z
    .string()
    .min(1, { error: 'SHOPIFY_STOREFRONT_ACCESS_TOKEN is required' }),
})

/**
 * Environment variables for the HubSpot integration.
 * At least one of `HUBSPOT_ACCESS_TOKEN` or `NEXT_PUBLIC_HUBSPOT_PORTAL_ID`
 * must be provided.
 */
export const hubspotEnvSchema = z
  .object({
    HUBSPOT_ACCESS_TOKEN: z
      .string()
      .min(1, { error: 'HUBSPOT_ACCESS_TOKEN must be non-empty when provided' })
      .optional(),
    NEXT_PUBLIC_HUBSPOT_PORTAL_ID: z
      .string()
      .min(1, {
        error: 'NEXT_PUBLIC_HUBSPOT_PORTAL_ID must be non-empty when provided',
      })
      .optional(),
  })
  .refine(
    (env) =>
      env.HUBSPOT_ACCESS_TOKEN !== undefined ||
      env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID !== undefined,
    {
      error:
        'At least one of HUBSPOT_ACCESS_TOKEN or NEXT_PUBLIC_HUBSPOT_PORTAL_ID is required',
    }
  )

/** Environment variables required by the Mailchimp integration. */
export const mailchimpEnvSchema = z.object({
  MAILCHIMP_API_KEY: z
    .string()
    .min(1, { error: 'MAILCHIMP_API_KEY is required' }),
  MAILCHIMP_SERVER_PREFIX: z
    .string()
    .min(1, { error: 'MAILCHIMP_SERVER_PREFIX is required' }),
  MAILCHIMP_AUDIENCE_ID: z
    .string()
    .min(1, { error: 'MAILCHIMP_AUDIENCE_ID is required' }),
})

/** Environment variables required by Cloudflare Turnstile captcha. */
export const turnstileEnvSchema = z.object({
  NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: z
    .string()
    .min(1, { error: 'NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY is required' }),
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z
    .string()
    .min(1, { error: 'CLOUDFLARE_TURNSTILE_SECRET_KEY is required' }),
})

/**
 * Environment variables for analytics integrations.
 * At least one of `NEXT_PUBLIC_GOOGLE_ANALYTICS` or
 * `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID` must be provided.
 */
export const analyticsEnvSchema = z
  .object({
    NEXT_PUBLIC_GOOGLE_ANALYTICS: z
      .string()
      .min(1, {
        error: 'NEXT_PUBLIC_GOOGLE_ANALYTICS must be non-empty when provided',
      })
      .optional(),
    NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z
      .string()
      .min(1, {
        error:
          'NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID must be non-empty when provided',
      })
      .optional(),
  })
  .refine(
    (env) =>
      env.NEXT_PUBLIC_GOOGLE_ANALYTICS !== undefined ||
      env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID !== undefined,
    {
      error:
        'At least one of NEXT_PUBLIC_GOOGLE_ANALYTICS or NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID is required',
    }
  )

/** Core environment variables required by the application. */
export const coreEnvSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z.url({
    error: 'NEXT_PUBLIC_BASE_URL must be a valid URL',
  }),
})

// ---------------------------------------------------------------------------
// Form data parsing helper
// ---------------------------------------------------------------------------

/**
 * Parse and validate `FormData` against a Zod schema.
 *
 * On **success** returns `{ success: true, data: T }`.
 * On **failure** returns a `FormState<T>` with `status: 400`, a generic
 * message, and per-field errors keyed by dot-joined path.
 *
 * @example
 * ```ts
 * const result = parseFormData(mySchema, formData)
 * if ('success' in result) {
 *   // result.data is fully typed
 * } else {
 *   // result is FormState with fieldErrors
 * }
 * ```
 */
export function parseFormData<T>(
  schema: z.ZodType<T>,
  formData: FormData
): FormState<T> | { success: true; data: T } {
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = value
  }

  const result = schema.safeParse(raw)

  if (!result.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join('.')
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message
      }
    }
    return {
      status: 400,
      message: 'Validation failed',
      fieldErrors,
    }
  }

  return { success: true, data: result.data }
}

// ---------------------------------------------------------------------------
// Client/server validation bridge
// ---------------------------------------------------------------------------

/**
 * Convert a Zod schema into a simple `(value: string) => boolean` validator.
 * Use this to bridge Zod schemas with the form hook's client-side validation.
 *
 * @example
 * ```ts
 * import { emailSchema, zodToValidator } from '@/utils/validation'
 * import { addValidator } from '@/components/ui/form/hook'
 *
 * addValidator('email', zodToValidator(emailSchema))
 * ```
 */
export function zodToValidator(schema: z.ZodType): (value: string) => boolean {
  return (value: string) => schema.safeParse(value).success
}
