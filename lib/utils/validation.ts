import { z } from 'zod'

import type { FormState } from '@/lib/types/form'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Any value produced by `JSON.parse` — the honest shape of unparsed external JSON. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

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

/**
 * Environment variables required by the Sanity CMS integration.
 *
 * `NEXT_PUBLIC_SANITY_PROJECT_ID` and `SANITY_STUDIO_PROJECT_ID` (Sanity's
 * own CLI/template convention) are both accepted as the project ID —
 * matching the same fallback `lib/integrations/sanity/env.ts` reads at
 * runtime, so this schema and that module can't disagree about whether
 * Sanity is configured. See `lib/utils/sanity-env-alias.test.ts`, which
 * fails if the two ever drift.
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

/**
 * Capability schema for the HubSpot embedded form widget, which only needs
 * the public portal ID (loaded client-side via HubSpot's embed script).
 */
export const hubspotEmbedEnvSchema = z.object({
  NEXT_PUBLIC_HUBSPOT_PORTAL_ID: z
    .string()
    .min(1, { error: 'NEXT_PUBLIC_HUBSPOT_PORTAL_ID is required' }),
})

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

/**
 * Core environment variables for the application.
 * NEXT_PUBLIC_BASE_URL is optional here — lib/env.ts is the single authority
 * (it falls back to localhost:3000 for dev and warns in production when unset).
 */
export const coreEnvSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z
    .url({
      error: 'NEXT_PUBLIC_BASE_URL must be a valid URL',
    })
    .optional(),
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
  const raw: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
  const seenKeys = new Set<string>()
  for (const key of formData.keys()) {
    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    const values = formData.getAll(key)
    // A key that appears once stays a scalar (existing schemas expect a
    // single value); a repeated key (e.g. a checkbox group sharing one
    // `name`) collects into an array so `z.array(...)` fields work. `key`
    // came from `formData.keys()`, so `values` always has at least one
    // entry — the `''` fallback is unreachable, only there to satisfy
    // noUncheckedIndexedAccess honestly instead of asserting past it.
    raw[key] = values.length > 1 ? values : (values[0] ?? '')
  }

  const result = schema.safeParse(raw)

  if (!result.success) {
    // `z.flattenError` already splits root-path issues into `formErrors`
    // (surfaced under `_form`) and per-field issues into `fieldErrors`
    // (one message array per key) — first-error-wins is just index 0.
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

// ---------------------------------------------------------------------------
// External-boundary response parsing
// ---------------------------------------------------------------------------

/**
 * Validate already-parsed JSON from an external API against a Zod schema.
 *
 * Use this at every integration boundary instead of casting
 * `(await res.json()) as T`. On mismatch it throws a descriptive error so the
 * failure surfaces at the edge — with the offending paths named — rather than
 * as an opaque property-access crash deep in the call chain (e.g. during a
 * vendor API version bump).
 *
 * @param schema  Zod schema describing the expected response shape.
 * @param data    The parsed JSON (the result of `await res.json()`).
 * @param context Optional label for the source, included in the thrown message
 *                (e.g. `'Shopify Storefront'`, `'HubSpot forms API'`).
 *
 * @example
 * ```ts
 * const json = await res.json()
 * const body = parseApiResponse(shopifyEnvelopeSchema, json, 'Shopify Storefront')
 * ```
 */
// Every `parseApiResponse` call site is a stable, module-scoped exported
// schema (Shopify/HubSpot/Mailchimp envelope and data schemas) reused across
// requests, so a per-schema-object cache compiles each one exactly once, on
// its first call, and every later call reuses the compiled version — never
// per request. `z.compile` never throws (an unsupported schema node falls
// back to the interpreted runtime automatically), so this is safe to apply
// unconditionally. It generates code via `new Function`, which the Edge
// runtime and a strict CSP forbid — safe today because every current caller
// (`lib/integrations/shopify/client.ts`, `lib/integrations/mailchimp/mailchimp-client.ts`,
// `lib/utils/fetch.ts#fetchJSON`) runs on the Node runtime; an Edge caller
// would need an interpreted path instead of this cache.
const compiledSchemaCache = new WeakMap<z.ZodType, z.ZodType>()

function getCompiledSchema<T>(schema: z.ZodType<T>): z.ZodType<T> {
  const cached = compiledSchemaCache.get(schema)
  if (cached) {
    // SAFETY: the cache is only ever populated below by compiling this exact
    // `schema` reference, so a hit's value type always matches `T` — the
    // `WeakMap<z.ZodType, z.ZodType>` key type can't express that per-entry link.
    return cached as z.ZodType<T>
  }
  const compiled = z.compile(schema)
  compiledSchemaCache.set(schema, compiled)
  return compiled
}

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
