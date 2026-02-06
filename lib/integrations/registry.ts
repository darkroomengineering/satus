/**
 * Integration Registry
 *
 * Single source of truth for all available integrations.
 * Each integration declares its name, env schema, and documentation link.
 *
 * To add a new integration:
 * 1. Create its Zod env schema in `@/utils/validation`
 * 2. Add an entry here
 * 3. Everything else (check-integration, doctor) picks it up automatically
 */

import type { z } from 'zod'
import {
  analyticsEnvSchema,
  hubspotEnvSchema,
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

export type IntegrationId = keyof typeof integrations

/**
 * Check if a specific integration is configured
 */
export function isConfigured(id: IntegrationId): boolean {
  return integrations[id].envSchema.safeParse(process.env).success
}

/**
 * Get all configured integration names
 */
export function getConfigured(): string[] {
  return Object.values(integrations)
    .filter((entry) => entry.envSchema.safeParse(process.env).success)
    .map((entry) => entry.name)
}

/**
 * Get all unconfigured integration names
 */
export function getUnconfigured(): string[] {
  return Object.values(integrations)
    .filter((entry) => !entry.envSchema.safeParse(process.env).success)
    .map((entry) => entry.name)
}
