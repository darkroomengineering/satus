/**
 * Centralized Feature Detection
 *
 * This module provides a single source of truth for feature detection
 * based on environment variables and configuration. Use this instead
 * of checking process.env directly throughout the codebase.
 *
 * @example
 * ```tsx
 * import { features } from '~/lib/config/features'
 *
 * // Check if WebGL is enabled
 * if (features.webgl) {
 *   // Load WebGL components
 * }
 *
 * // Conditionally render based on integrations
 * {features.sanity && <SanityComponent />}
 * ```
 */

export const features = {
  // WebGL / 3D Graphics - disabled by default, enable with NEXT_PUBLIC_ENABLE_WEBGL=true
  webgl: Boolean(process.env.NEXT_PUBLIC_ENABLE_WEBGL),

  // Content Management
  sanity: Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID),

  // E-commerce
  shopify: Boolean(process.env.SHOPIFY_STORE_DOMAIN),

  // Marketing & Forms
  hubspot: Boolean(process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID),

  // Email Marketing
  mailchimp: Boolean(process.env.MAILCHIMP_API_KEY),

  // Transactional Email
  mandrill: Boolean(process.env.MANDRILL_API_KEY),

  // Analytics
  analytics: Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS ||
      process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER ||
      process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  ),

  // Bot Protection
  turnstile: Boolean(process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY),

  // Development Tools (always false in production)
  devtools: process.env.NODE_ENV === 'development',
} as const

/**
 * All available features
 */
export type Features = typeof features

/**
 * Feature names for type safety
 */
export type FeatureName = keyof Features

/**
 * Check if a specific feature is enabled
 */
export const isFeatureEnabled = (feature: FeatureName): boolean => {
  return features[feature]
}

/**
 * Get all enabled features
 */
export const getEnabledFeatures = (): FeatureName[] => {
  return Object.keys(features).filter(
    (key) => features[key as FeatureName]
  ) as FeatureName[]
}

/**
 * Get all disabled features
 */
export const getDisabledFeatures = (): FeatureName[] => {
  return Object.keys(features).filter(
    (key) => !features[key as FeatureName]
  ) as FeatureName[]
}
