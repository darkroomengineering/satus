/**
 * Integration Registry
 *
 * Single source of truth for all available integrations.
 * Each integration declares its name, env schema, and documentation link.
 *
 * To add a new integration:
 * 1. Create its Zod env schema in `@/utils/validation`
 * 2. Add an entry here
 * 3. Everything else (doctor, listing helpers, setup scripts) picks it up automatically
 */

import type { z } from 'zod'

// Relative import, not the `@/utils/validation` alias used elsewhere in this
// codebase: this file is required transitively when `next.config.ts` imports
// the CSP composer (`./csp`), which imports this registry. Next's
// next.config.ts loader (`next/dist/build/next-config-ts/require-hook.js`)
// rewrites `@/*` aliases via SWC's `paths` option, but only resolves them
// correctly for the entry file itself — a transitively-required file's own
// `@/*` import gets rewritten relative to the wrong directory and 404s
// (verified empirically: `Cannot find module './lib/utils/validation'`
// required from this file). A relative import sidesteps the bug entirely.
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
 * Content-Security-Policy directives an integration's browser-visible code
 * genuinely needs (script/style/img/etc. `src` lists, minus the `'self'`
 * baseline every directive already gets). Consumed by
 * `./csp`'s `composeCsp()`, which unions this across every KEPT integration
 * (see `./csp` for what "kept" means) to build the single enforced
 * `Content-Security-Policy` header in `next.config.ts`.
 *
 * An integration that is entirely server-side (no origin a browser ever
 * talks to directly — e.g. a fetch made only from a Server Component,
 * Server Action, or Route Handler) declares nothing here. Adding an origin
 * "just in case" defeats the point: the whole feature is that the shipped
 * policy reflects exactly what the kept code loads.
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
  /** Display name */
  name: string
  /** Zod schema for required environment variables */
  envSchema: z.ZodType
  /**
   * Optional narrower schemas for sub-capabilities of this integration.
   * Use `hasCapability(id, capability)` to check one of these instead of
   * `isConfigured(id)` when a code path needs more than "some env var is
   * set" (e.g. HubSpot's `embed` capability requires only the public
   * portal id, while `isConfigured('hubspot')` accepts either var).
   */
  capabilities?: Record<string, z.ZodType>
  /** Documentation or setup link */
  docsUrl?: string
  /** CSP origins this integration's browser-visible code needs. See `CspSources`. */
  cspSources?: CspSources
}

export const integrations = {
  sanity: {
    name: 'Sanity',
    envSchema: sanityEnvSchema,
    docsUrl: 'https://www.sanity.io/docs',
    cspSources: {
      // Images: `lib/integrations/sanity/client.ts` + `@sanity/image-url`'s
      // `urlForImage()` (used by `components/ui/sanity-image`) build URLs on
      // `cdn.sanity.io` — the same host already trusted by
      // `next.config.ts`'s `images.remotePatterns`.
      'img-src': ['https://cdn.sanity.io'],
      // Live/API: `next-sanity`'s `defineLive`/`SanityLive`
      // (`lib/integrations/sanity/live/index.tsx`, rendered client-side from
      // `app/(site)/layout.tsx`) opens a live-events connection, and
      // `client.ts` reads with `useCdn: true`. Both hosts are project-id
      // subdomains — confirmed in `@sanity/client`'s
      // `dist/_chunks-cjs/config.cjs` (`defaultConfig.apiHost =
      // "https://api.sanity.io"`, `defaultCdnHost = "apicdn.sanity.io"`,
      // both prefixed with `<projectId>.`) — so the source must be a
      // wildcard subdomain, not a literal host.
      // The bare host (no project subdomain) is what the embedded Studio at
      // /studio uses for tracing and feedback calls; the wildcards don't
      // match a bare apex, so it needs its own entry.
      'connect-src': [
        'https://*.api.sanity.io',
        'https://*.apicdn.sanity.io',
        'https://api.sanity.io',
      ],
    },
  },
  shopify: {
    name: 'Shopify',
    envSchema: shopifyEnvSchema,
    docsUrl: 'https://shopify.dev/docs/api/storefront',
    cspSources: {
      // Images only — the same host `next.config.ts`'s
      // `images.remotePatterns` already trusts. Every Storefront API call
      // (`lib/integrations/shopify/client.ts`'s `shopifyFetch`) runs from a
      // Server Component, Server Action, or Route Handler; none of the
      // 'use client' cart files (`cart-context.tsx`, `cart-store-context.ts`,
      // `add-to-cart/index.tsx`, `modal/index.tsx`) call it directly, so
      // there is no browser-visible `connect-src` origin to declare.
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
      // `lib/integrations/hubspot/embed/index.tsx` loads HubSpot's embeddable
      // forms script via `<Script src="https://js.hsforms.net/forms/v2.js">`.
      // The server-side form submission path (`action.ts`'s POST to
      // `api.hsforms.com`) never runs in the browser, so it needs no entry
      // here. Not verified: what origin(s) the rendered form itself talks to
      // once loaded (submission/tracking) — that depends on the HubSpot
      // portal's own config and isn't observable from this repo's code. Add
      // it via `PROJECT_CSP_EXTRA_SOURCES` in `./csp` if a project hits a
      // violation after wiring this component into a page.
      'script-src': ['https://js.hsforms.net'],
    },
  },
  mailchimp: {
    name: 'Mailchimp',
    envSchema: mailchimpEnvSchema,
    docsUrl: 'https://mailchimp.com/developer/',
    // No cspSources: `lib/integrations/mailchimp/{action,mailchimp-client}.ts`
    // call the Mailchimp API only from server code (Server Actions / route
    // handlers) — no browser-visible origin exists to declare.
  },
  turnstile: {
    name: 'Turnstile',
    envSchema: turnstileEnvSchema,
    docsUrl: 'https://developers.cloudflare.com/turnstile/',
    // No cspSources: `lib/integrations/turnstile/index.ts` only calls
    // Cloudflare's siteverify endpoint server-side. Per its own README ("The
    // starter ships no widget component — render it with Cloudflare's
    // script"), this repo has no client-side Turnstile widget today, so
    // there's no `challenges.cloudflare.com` script/frame to allow yet. A
    // project that adds the widget needs `script-src`/`frame-src
    // https://challenges.cloudflare.com` — add it via
    // `PROJECT_CSP_EXTRA_SOURCES` in `./csp`.
  },
  analytics: {
    name: 'Analytics',
    envSchema: analyticsEnvSchema,
    docsUrl: 'https://developers.google.com/analytics',
    // No cspSources: this entry validates NEXT_PUBLIC_GOOGLE_ANALYTICS /
    // NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID (see `lib/utils/validation.ts`), but
    // no code in this repo actually loads a Google Analytics/Tag Manager
    // script — the env schema exists for `doctor`/validation only. Nothing
    // to allow until that loader exists. (Not to be confused with
    // `@vercel/analytics`, wired in `app/(site)/layout.tsx` — that one is
    // handled directly in `./csp`, since it isn't a registry integration.)
  },
} as const satisfies Record<string, IntegrationEntry>

/** Union of all runtime-detectable integration ids (keys of the registry). */
export type IntegrationId = keyof typeof integrations

/**
 * Integrations that are dev-time-only removables with no runtime env detection.
 * These exist in the setup scripts' bundle record but not in the runtime registry.
 */
export const devOnlyRemovables = ['webgl', 'theatre'] as const

/** Union of all ids that can be targeted for removal during project setup. */
export type RemovableId = IntegrationId | (typeof devOnlyRemovables)[number]

/**
 * Every check in this module validates the whole `process.env` object, which
 * only holds real values on the server. Bundlers inline `process.env.FOO`
 * literals into client code but leave a wholesale `process.env` reference
 * pointing at the browser `process` polyfill, whose `env` is a permanently
 * empty `{}`. A client-side call would therefore report every integration as
 * unconfigured — silently, and wrongly. Throw instead of returning that.
 *
 * Delegates to the shared `assertServerEnvironment` (see
 * `../utils/assert-server-environment` for the full rationale) so this guard
 * can't drift from `@/lib/env`'s copy of the same check.
 */
function assertServerEnvironment(): void {
  assertServerEnv('@/integrations/registry')
}

/**
 * Check if a specific integration is configured
 */
export function isConfigured(id: IntegrationId): boolean {
  assertServerEnvironment()
  return integrations[id].envSchema.safeParse(process.env).success
}

/** Union of capability names declared by a given integration, if any. */
export type CapabilityOf<Id extends IntegrationId> =
  (typeof integrations)[Id] extends { capabilities: Record<infer K, z.ZodType> }
    ? K
    : never

/**
 * Check if a specific capability of an integration is configured.
 *
 * Capabilities are narrower env requirements than the integration's overall
 * `envSchema` (e.g. HubSpot's `embed` capability requires only the public
 * portal id, while `isConfigured('hubspot')` accepts either var).
 *
 * Fallback: if the integration declares no `capabilities` (or the named
 * capability doesn't exist on it), this falls back to `isConfigured(id)`.
 */
export function hasCapability<Id extends IntegrationId>(
  id: Id,
  capability: CapabilityOf<Id> extends never ? string : CapabilityOf<Id>
): boolean {
  assertServerEnvironment()
  // Widen from the literal entry union (where most entries lack the key)
  // to the interface, which declares `capabilities` as optional.
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

/**
 * Get all configured integration ids
 */
export function getConfiguredIds(): IntegrationId[] {
  assertServerEnvironment()
  // SAFETY: `integrations` is keyed exactly by `IntegrationId` — `Object.keys`
  // just types every result as plain `string[]` regardless of the source
  // object's literal keys.
  return (Object.keys(integrations) as IntegrationId[]).filter(
    (id) => integrations[id].envSchema.safeParse(process.env).success
  )
}

/**
 * Get all configured integration display names, for human-facing output
 * (handoff summaries, logs). For programmatic matching against bundle keys,
 * use `getConfiguredIds()`.
 */
export function getConfigured(): string[] {
  assertServerEnvironment()
  return Object.values(integrations).flatMap((entry) =>
    entry.envSchema.safeParse(process.env).success ? [entry.name] : []
  )
}

/**
 * Get all unconfigured integration names
 */
export function getUnconfigured(): string[] {
  assertServerEnvironment()
  return Object.values(integrations).flatMap((entry) =>
    entry.envSchema.safeParse(process.env).success ? [] : [entry.name]
  )
}
