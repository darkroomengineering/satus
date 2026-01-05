/**
 * Integration Configuration Checker
 *
 * Utilities to check if integrations are configured via environment variables.
 * This helps with tree-shaking unused integrations from the bundle.
 *
 * Usage:
 * ```ts
 * import { isShopifyConfigured } from '~/integrations/check-integration'
 *
 * if (isShopifyConfigured()) {
 *   // Only import and use Shopify code if configured
 *   const { ShopifyCart } = await import('~/integrations/shopify/cart')
 * }
 * ```
 */

/**
 * Check if Sanity CMS is configured
 * Requires: NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET
 */
export function isSanityConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
      process.env.NEXT_PUBLIC_SANITY_DATASET
  )
}

/**
 * Check if Shopify is configured
 * Requires: SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN
 */
export function isShopifyConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_STORE_DOMAIN &&
      process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
  )
}

/**
 * Check if HubSpot is configured
 * Requires: HUBSPOT_ACCESS_TOKEN or NEXT_PUBLIC_HUBSPOT_PORTAL_ID
 */
export function isHubSpotConfigured(): boolean {
  return Boolean(
    process.env.HUBSPOT_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID
  )
}

/**
 * Check if Mailchimp is configured
 * Requires: MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, and MAILCHIMP_AUDIENCE_ID
 */
export function isMailchimpConfigured(): boolean {
  return Boolean(
    process.env.MAILCHIMP_API_KEY &&
      process.env.MAILCHIMP_SERVER_PREFIX &&
      process.env.MAILCHIMP_AUDIENCE_ID
  )
}

/**
 * Check if Mandrill is configured
 * Requires: MANDRILL_API_KEY
 */
export function isMandrillConfigured(): boolean {
  return Boolean(process.env.MANDRILL_API_KEY)
}

/**
 * Check if Google Analytics is configured
 * Requires: NEXT_PUBLIC_GOOGLE_ANALYTICS or NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID
 */
export function isAnalyticsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS ||
      process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID
  )
}

/**
 * Check if Cloudflare Turnstile is configured
 * Requires: NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY and CLOUDFLARE_TURNSTILE_SECRET_KEY
 */
export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY &&
      process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  )
}

/**
 * Get a list of all configured integrations
 */
export function getConfiguredIntegrations(): string[] {
  const integrations: string[] = []

  if (isSanityConfigured()) integrations.push('Sanity')
  if (isShopifyConfigured()) integrations.push('Shopify')
  if (isHubSpotConfigured()) integrations.push('HubSpot')
  if (isMailchimpConfigured()) integrations.push('Mailchimp')
  if (isMandrillConfigured()) integrations.push('Mandrill')
  if (isTurnstileConfigured()) integrations.push('Turnstile')

  return integrations
}

/**
 * Get a list of all unconfigured integrations
 */
export function getUnconfiguredIntegrations(): string[] {
  const integrations: string[] = []

  if (!isSanityConfigured()) integrations.push('Sanity')
  if (!isShopifyConfigured()) integrations.push('Shopify')
  if (!isHubSpotConfigured()) integrations.push('HubSpot')
  if (!isMailchimpConfigured()) integrations.push('Mailchimp')
  if (!isMandrillConfigured()) integrations.push('Mandrill')
  if (!isTurnstileConfigured()) integrations.push('Turnstile')

  return integrations
}
