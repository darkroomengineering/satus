import { z } from 'zod'

import type { FormState } from '@/lib/types/form'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export const emailSchema = z.email({ error: 'Invalid email address' })

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, {
  error: 'Invalid phone number (E.164 format)',
})

/**
 * Accepts `SANITY_STUDIO_PROJECT_ID` as an alias for the project ID, matching
 * the fallback `lib/integrations/sanity/env.ts` reads, so the two can't
 * disagree about whether Sanity is configured.
 * `lib/utils/sanity-env-alias.test.ts` fails if they drift.
 */
export const sanityEnvSchema = z
  .object({
    NEXT_PUBLIC_SANITY_PROJECT_ID: z
      .string()
      .min(1, {
        error: 'NEXT_PUBLIC_SANITY_PROJECT_ID must be non-empty when provided',
      })
      .optional(),
    SANITY_STUDIO_PROJECT_ID: z
      .string()
      .min(1, {
        error: 'SANITY_STUDIO_PROJECT_ID must be non-empty when provided',
      })
      .optional(),
    NEXT_PUBLIC_SANITY_DATASET: z
      .string()
      .min(1, { error: 'NEXT_PUBLIC_SANITY_DATASET is required' }),
  })
  .refine(
    (env) =>
      env.NEXT_PUBLIC_SANITY_PROJECT_ID !== undefined ||
      env.SANITY_STUDIO_PROJECT_ID !== undefined,
    {
      error:
        'NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID is required',
    }
  )

export const shopifyEnvSchema = z.object({
  SHOPIFY_STORE_DOMAIN: z
    .string()
    .min(1, { error: 'SHOPIFY_STORE_DOMAIN is required' }),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z
    .string()
    .min(1, { error: 'SHOPIFY_STOREFRONT_ACCESS_TOKEN is required' }),
})

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

/** The embedded form widget loads client-side and needs only the public portal ID. */
export const hubspotEmbedEnvSchema = z.object({
  NEXT_PUBLIC_HUBSPOT_PORTAL_ID: z
    .string()
    .min(1, { error: 'NEXT_PUBLIC_HUBSPOT_PORTAL_ID is required' }),
})

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

export const turnstileEnvSchema = z.object({
  NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: z
    .string()
    .min(1, { error: 'NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY is required' }),
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z
    .string()
    .min(1, { error: 'CLOUDFLARE_TURNSTILE_SECRET_KEY is required' }),
})

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

/**
 * `NEXT_PUBLIC_BASE_URL` is optional here: `lib/env.ts` is the single
 * authority (localhost fallback in dev, warning in production when unset).
 */
export const coreEnvSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z
    .url({
      error: 'NEXT_PUBLIC_BASE_URL must be a valid URL',
    })
    .optional(),
})

/**
 * Returns `{ success: true, data }`, or a `FormState<T>` with `status: 400`
 * and per-field errors keyed by dot-joined path (root issues under `_form`).
 */
export function parseFormData<T>(
  schema: z.ZodType<T>,
  formData: FormData
): FormState<T> | { success: true; data: T } {
  const raw: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
  const seenKeys = new Set<string>()
  for (const key of formData.keys()) {
    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    const values = formData.getAll(key)
    // A single key stays a scalar (existing schemas expect one value); a
    // repeated key (checkbox group sharing a `name`) becomes an array. The
    // `''` fallback is unreachable: `key` came from `formData.keys()`.
    raw[key] = values.length > 1 ? values : (values[0] ?? '')
  }

  const result = schema.safeParse(raw)

  if (!result.success) {
    // First error per key wins (index 0).
    const flat = z.flattenError(result.error)
    const fieldErrors: Record<string, string> = {}
    for (const key in flat.fieldErrors) {
      const message = flat.fieldErrors[key]?.[0]
      if (message) fieldErrors[key] = message
    }
    if (flat.formErrors[0]) fieldErrors._form = flat.formErrors[0]

    return {
      status: 400,
      message: 'Validation failed',
      fieldErrors,
    }
  }

  return { success: true, data: result.data }
}

/** Bridges a Zod schema to the form hook's `(value) => boolean` client validators. */
export function zodToValidator(schema: z.ZodType): (value: string) => boolean {
  return (value: string) => schema.safeParse(value).success
}

// Every `parseApiResponse` call site passes a stable, module-scoped schema
// (Shopify/HubSpot/Mailchimp envelopes), so each is compiled once and cached
// per schema object. `z.compile` generates code via `new Function`, which the
// Edge runtime and a strict CSP forbid. Safe today because every caller
// (`lib/integrations/shopify/client.ts`,
// `lib/integrations/mailchimp/mailchimp-client.ts`,
// `lib/utils/fetch.ts#fetchJSON`) runs on Node; an Edge caller needs an
// interpreted path instead.
const compiledSchemaCache = new WeakMap<z.ZodType, z.ZodType>()

function getCompiledSchema<T>(schema: z.ZodType<T>): z.ZodType<T> {
  const cached = compiledSchemaCache.get(schema)
  if (cached) {
    // SAFETY: the cache is only populated below by compiling this exact
    // `schema`, so a hit's value type matches `T`; the `WeakMap` key type
    // can't express that per-entry link.
    return cached as z.ZodType<T>
  }
  const compiled = z.compile(schema)
  compiledSchemaCache.set(schema, compiled)
  return compiled
}

/**
 * Validates parsed JSON from an external API. Use at every integration
 * boundary instead of `(await res.json()) as T`: a mismatch throws at the
 * edge with the offending paths named, not as a property-access crash deep in
 * the call chain. `context` labels the source in the thrown message.
 */
export function parseApiResponse<T>(
  schema: z.ZodType<T>,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- this function is itself the I/O-boundary parser; `lib/integrations/**` callers deliberately type `res.json()` as `unknown` and rely on this call to validate it
  data: unknown,
  context?: string
): T {
  const result = getCompiledSchema(schema).safeParse(data)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    throw new Error(
      `Invalid API response${context ? ` from ${context}` : ''}: ${detail}`
    )
  }
  return result.data
}
