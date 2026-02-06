/**
 * Integration Configuration Checker
 *
 * Utilities to check if integrations are configured via environment variables.
 * This helps with tree-shaking unused integrations from the bundle.
 *
 * All checks are backed by Zod schemas defined in the integration registry.
 *
 * Usage:
 * ```ts
 * import { isShopifyConfigured } from '@/integrations/check-integration'
 *
 * if (isShopifyConfigured()) {
 *   const { ShopifyCart } = await import('@/integrations/shopify/cart')
 * }
 * ```
 */

import { getConfigured, getUnconfigured, isConfigured } from './registry'

/** Check if Sanity CMS is configured */
export function isSanityConfigured(): boolean {
  return isConfigured('sanity')
}

/** Check if Shopify is configured */
export function isShopifyConfigured(): boolean {
  return isConfigured('shopify')
}

/** Check if HubSpot is configured */
export function isHubSpotConfigured(): boolean {
  return isConfigured('hubspot')
}

/** Check if Mailchimp is configured */
export function isMailchimpConfigured(): boolean {
  return isConfigured('mailchimp')
}

/** Check if Google Analytics is configured */
export function isAnalyticsConfigured(): boolean {
  return isConfigured('analytics')
}

/** Check if Cloudflare Turnstile is configured */
export function isTurnstileConfigured(): boolean {
  return isConfigured('turnstile')
}

/** Get a list of all configured integrations */
export function getConfiguredIntegrations(): string[] {
  return getConfigured()
}

/** Get a list of all unconfigured integrations */
export function getUnconfiguredIntegrations(): string[] {
  return getUnconfigured()
}
