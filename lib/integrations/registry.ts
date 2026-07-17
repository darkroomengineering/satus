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
import {
  analyticsEnvSchema,
  hubspotEmbedEnvSchema,
  hubspotEnvSchema,
  hubspotFormsApiEnvSchema,
  mailchimpEnvSchema,
  sanityEnvSchema,
  shopifyEnvSchema,
  turnstileEnvSchema,
} from '@/utils/validation'

export interface IntegrationEntry {
  /** Display name */
  name: string
  /** Zod schema for required environment variables */
  envSchema: z.ZodType
  /**
   * Optional narrower schemas for sub-capabilities of this integration.
   * Use `hasCapability(id, capability)` to check one of these instead of
   * `isConfigured(id)` when a code path needs more than "some env var is
   * set" (e.g. HubSpot's Forms API needs the access token specifically,
   * not just the portal ID that satisfies `isConfigured('hubspot')`).
   */
  capabilities?: Record<string, z.ZodType>
  /** Documentation or setup link */
  docsUrl?: string
}

export const integrations = {
  sanity: {
    name: 'Sanity',
    envSchema: sanityEnvSchema,
    docsUrl: 'https://www.sanity.io/docs',
  },
  shopify: {
    name: 'Shopify',
    envSchema: shopifyEnvSchema,
    docsUrl: 'https://shopify.dev/docs/api/storefront',
  },
  hubspot: {
    name: 'HubSpot',
    envSchema: hubspotEnvSchema,
    capabilities: {
      formsApi: hubspotFormsApiEnvSchema,
      embed: hubspotEmbedEnvSchema,
    },
    docsUrl: 'https://developers.hubspot.com/docs/api',
  },
  mailchimp: {
    name: 'Mailchimp',
    envSchema: mailchimpEnvSchema,
    docsUrl: 'https://mailchimp.com/developer/',
  },
  turnstile: {
    name: 'Turnstile',
    envSchema: turnstileEnvSchema,
    docsUrl: 'https://developers.cloudflare.com/turnstile/',
  },
  analytics: {
    name: 'Analytics',
    envSchema: analyticsEnvSchema,
    docsUrl: 'https://developers.google.com/analytics',
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
 * Check if a specific integration is configured
 */
export function isConfigured(id: IntegrationId): boolean {
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
 * `envSchema` (e.g. HubSpot's `formsApi` capability requires the access
 * token specifically, while `isConfigured('hubspot')` only requires *some*
 * HubSpot env var to be set).
 *
 * Fallback: if the integration declares no `capabilities` (or the named
 * capability doesn't exist on it), this falls back to `isConfigured(id)`.
 */
export function hasCapability<Id extends IntegrationId>(
  id: Id,
  capability: CapabilityOf<Id> extends never ? string : CapabilityOf<Id>
): boolean {
  // Widen from the literal entry union (where most entries lack the key)
  // to the interface, which declares `capabilities` as optional.
  const entry: IntegrationEntry = integrations[id]
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
  return Object.values(integrations).flatMap((entry) =>
    entry.envSchema.safeParse(process.env).success ? [entry.name] : []
  )
}

/**
 * Get all unconfigured integration names
 */
export function getUnconfigured(): string[] {
  return Object.values(integrations).flatMap((entry) =>
    entry.envSchema.safeParse(process.env).success ? [] : [entry.name]
  )
}
