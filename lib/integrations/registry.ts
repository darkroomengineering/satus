/**
 * Single source of truth for available integrations: name, env schema, docs
 * link. Adding one is an env schema in `@/utils/validation` plus an entry
 * here; doctor, listing helpers and setup scripts pick it up.
 */

import type { z } from 'zod'

// Relative imports, not `@/` aliases: `next.config.ts` requires this file
// transitively via `./csp`, and Next's config loader resolves `@/*` correctly
// only for the entry file (`Cannot find module './lib/utils/validation'`).
import { assertServerEnvironment as assertServerEnv } from '../utils/assert-server-environment'
import {
  analyticsEnvSchema,
  hubspotEmbedEnvSchema,
  hubspotEnvSchema,
  mailchimpEnvSchema,
  sanityEnvSchema,
  shopifyEnvSchema,
  turnstileEnvSchema,
} from '../utils/validation'

/**
 * CSP directives an integration's browser-visible code needs, minus the
 * `'self'` baseline. `./csp`'s `composeCsp()` unions them across kept
 * integrations. A server-only integration declares nothing: the policy must
 * reflect exactly what the kept code loads, so no "just in case" origins.
 */
export type CspDirective =
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'frame-src'
  | 'media-src'
  | 'form-action'

export type CspSources = Partial<Record<CspDirective, string[]>>

export interface IntegrationEntry {
  name: string
  envSchema: z.ZodType
  /**
   * Narrower schemas for sub-capabilities, checked with `hasCapability`
   * instead of `isConfigured` (HubSpot's `embed` needs only the public
   * portal id, while `isConfigured('hubspot')` accepts either var).
   */
  capabilities?: Record<string, z.ZodType>
  docsUrl?: string
  /** CSP origins this integration's browser-visible code needs. */
  cspSources?: CspSources
}

export const integrations = {
  sanity: {
    name: 'Sanity',
    envSchema: sanityEnvSchema,
    docsUrl: 'https://www.sanity.io/docs',
    cspSources: {
      // The browser loads `cdn.sanity.io` image URLs directly
      // (`components/ui/image`'s Sanity loader, not Next's optimizer).
      'img-src': ['https://cdn.sanity.io'],
      // The embedded Studio calls the API from the browser; `client.ts` reads
      // on the server, which CSP doesn't govern. The host is a project-id
      // subdomain, so it needs a wildcard, plus the bare host (the wildcard
      // doesn't match the apex) for the Studio's tracing and feedback calls.
      // No `*.apicdn.sanity.io`: no site route reads with `useCdn: true`, and
      // `/studio/*` gets it from `STUDIO_SOURCES` in `./csp.ts`. A browser-side
      // `useCdn: true` read adds the host back here.
      'connect-src': ['https://*.api.sanity.io', 'https://api.sanity.io'],
    },
  },
  shopify: {
    name: 'Shopify',
    envSchema: shopifyEnvSchema,
    docsUrl: 'https://shopify.dev/docs/api/storefront',
    cspSources: {
      // Images only (the host `images.remotePatterns` trusts). Every
      // Storefront API call (`shopifyFetch`) runs server-side; no 'use client'
      // cart file calls it, so there is no `connect-src` origin.
      'img-src': ['https://cdn.shopify.com'],
    },
  },
  hubspot: {
    name: 'HubSpot',
    envSchema: hubspotEnvSchema,
    capabilities: {
      embed: hubspotEmbedEnvSchema,
    },
    docsUrl: 'https://developers.hubspot.com/docs/api',
    cspSources: {
      // `hubspot/embed/index.tsx` loads the forms script. `action.ts`'s POST
      // to `api.hsforms.com` is server-side and needs no entry. Not verified:
      // the origins the rendered form talks to (they depend on the portal's
      // config); add them via `PROJECT_CSP_EXTRA_SOURCES` in `./csp` on a
      // violation.
      'script-src': ['https://js.hsforms.net'],
    },
  },
  mailchimp: {
    name: 'Mailchimp',
    envSchema: mailchimpEnvSchema,
    docsUrl: 'https://mailchimp.com/developer/',
    // No cspSources: the Mailchimp API is called only from server code.
  },
  turnstile: {
    name: 'Turnstile',
    envSchema: turnstileEnvSchema,
    docsUrl: 'https://developers.cloudflare.com/turnstile/',
    // No cspSources: siteverify is called server-side and the starter ships
    // no widget. A project adding the widget needs `script-src` and
    // `frame-src` for `https://challenges.cloudflare.com` via
    // `PROJECT_CSP_EXTRA_SOURCES` in `./csp`.
  },
  analytics: {
    name: 'Analytics',
    envSchema: analyticsEnvSchema,
    docsUrl: 'https://developers.google.com/analytics',
    // No cspSources: no code loads a Google Analytics/Tag Manager script;
    // the schema exists for `doctor`/validation only. `@vercel/analytics` is
    // not a registry integration and is handled directly in `./csp`.
  },
} as const satisfies Record<string, IntegrationEntry>

export type IntegrationId = keyof typeof integrations

/** Removables with no runtime env detection; in the setup bundles only. */
export const devOnlyRemovables = ['webgl', 'theatre'] as const

export type RemovableId = IntegrationId | (typeof devOnlyRemovables)[number]

/**
 * Every check here validates the whole `process.env`, which is empty in the
 * browser polyfill; a client call would silently report every integration as
 * unconfigured. Throws instead. Delegates to the shared guard so it can't
 * drift from `@/lib/env`'s copy.
 */
function assertServerEnvironment(): void {
  assertServerEnv('@/integrations/registry')
}

export function isConfigured(id: IntegrationId): boolean {
  assertServerEnvironment()
  return integrations[id].envSchema.safeParse(process.env).success
}

export type CapabilityOf<Id extends IntegrationId> =
  (typeof integrations)[Id] extends { capabilities: Record<infer K, z.ZodType> }
    ? K
    : never

/**
 * Whether a capability's narrower env requirement is met. Falls back to
 * `isConfigured(id)` when the integration declares no such capability.
 */
export function hasCapability<Id extends IntegrationId>(
  id: Id,
  capability: CapabilityOf<Id> extends never ? string : CapabilityOf<Id>
): boolean {
  assertServerEnvironment()
  // Widen from the literal entry union (most entries lack the key).
  const entry: IntegrationEntry = integrations[id]
  // SAFETY: `capability`'s type is a deferred conditional on the generic
  // `Id`, but both of its branches (`CapabilityOf<Id>` and the `string`
  // fallback) are always string-like — TS just can't resolve a deferred
  // conditional type for indexing purposes.
  const schema = entry.capabilities?.[capability as string]
  if (!schema) {
    return isConfigured(id)
  }
  return schema.safeParse(process.env).success
}

export function getConfiguredIds(): IntegrationId[] {
  assertServerEnvironment()
  // SAFETY: `integrations` is keyed exactly by `IntegrationId`; `Object.keys`
  // types its result as `string[]`.
  return (Object.keys(integrations) as IntegrationId[]).filter(
    (id) => integrations[id].envSchema.safeParse(process.env).success
  )
}

/** Display names for human-facing output; match programmatically with `getConfiguredIds()`. */
export function getConfigured(): string[] {
  assertServerEnvironment()
  return Object.values(integrations).flatMap((entry) =>
    entry.envSchema.safeParse(process.env).success ? [entry.name] : []
  )
}

export function getUnconfigured(): string[] {
  assertServerEnvironment()
  return Object.values(integrations).flatMap((entry) =>
    entry.envSchema.safeParse(process.env).success ? [] : [entry.name]
  )
}
