/**
 * Centralized Feature Detection & Configuration
 *
 * Combines satus.config.ts with environment variables for feature detection.
 * This module provides a single source of truth for feature flags and boundaries.
 *
 * @category starter-core
 * @modification-level structure-only
 * @preserve-structure true
 *
 * @example
 * ```tsx
 * import { features } from '@/lib/config/features'
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

/**
 * Runtime feature flags with satus.config.ts integration
 *
 * Priority order:
 * 1. Environment variables (highest priority)
 * 2. satus.config.ts settings
 * 3. Auto-detection from env presence
 * 4. Built-in defaults (lowest priority)
 */
export const features = {
  // WebGL / 3D Graphics
  webgl: Boolean(
    process.env.NEXT_PUBLIC_ENABLE_WEBGL === 'true' ||
      (process.env.NEXT_PUBLIC_ENABLE_WEBGL !== 'false' &&
        getSatusConfigFeature('webgl', true))
  ),

  // Content Management
  sanity: Boolean(
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
      getSatusConfigFeature('sanity', true)
  ),

  // E-commerce
  shopify: Boolean(
    process.env.SHOPIFY_STORE_DOMAIN || getSatusConfigFeature('shopify', false)
  ),

  // Marketing & Forms
  hubspot: Boolean(
    process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID ||
      getSatusConfigFeature('hubspot', false)
  ),

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

  // Animation System
  animations: Boolean(
    process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== 'false' &&
      getSatusConfigFeature('animations', true)
  ),

  // Smooth Scrolling
  smoothScrolling: Boolean(
    process.env.NEXT_PUBLIC_ENABLE_SMOOTH_SCROLL !== 'false' &&
      getSatusConfigFeature('smoothScrolling', true)
  ),

  // Development Tools
  devtools:
    process.env.NODE_ENV === 'development' ||
    getSatusConfigFeature('devTools', false),

  // Boundary System (development)
  showBoundaries: Boolean(
    process.env.SATUS_SHOW_BOUNDARIES === 'true' ||
      (process.env.NODE_ENV === 'development' &&
        getSatusConfigDev('showBoundaries', true))
  ),

  strictBoundaries: Boolean(
    process.env.SATUS_STRICT_BOUNDARIES === 'true' ||
      getSatusConfigDev('strictBoundaries', false)
  ),
} as const

/**
 * Helper functions to read from satus.config.ts
 * Uses dynamic import to avoid circular dependencies
 */
let satusConfigCache: {
  features?: Record<string, boolean>
  development?: Record<string, boolean>
} | null = null

/**
 * Get feature value from satus.config.ts with fallback
 */
function getSatusConfigFeature(
  feature: string,
  defaultValue: boolean
): boolean {
  try {
    if (!satusConfigCache) {
      // Note: This is a synchronous fallback - async loading happens in initializeFeatures()
      return defaultValue
    }
    return satusConfigCache.features?.[feature] ?? defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Get development setting from satus.config.ts with fallback
 */
function getSatusConfigDev(setting: string, defaultValue: boolean): boolean {
  try {
    if (!satusConfigCache) {
      return defaultValue
    }
    return satusConfigCache.development?.[setting] ?? defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Initialize the feature system by loading satus.config.ts
 * Call this early in your application lifecycle
 */
export async function initializeFeatures(): Promise<void> {
  try {
    const configModule = await import('../../satus.config')
    satusConfigCache = configModule.default

    // Log feature state in development
    if (features.devtools && typeof window !== 'undefined') {
      logFeatureState()
      // Add features to window for debugging
      ;(
        globalThis as { __SATUS_FEATURES__?: typeof features }
      ).__SATUS_FEATURES__ = features
    }
  } catch (_error) {
    console.warn(
      'Could not load satus.config.ts, using environment-only features'
    )
  }
}

/**
 * Development helper: Log current feature state
 */
export function logFeatureState(): void {
  if (!features.devtools) return

  console.group('🔧 Satus Features')
  Object.entries(features).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      console.log(`${key}: ${value ? '✅' : '❌'}`)
    }
  })
  console.groupEnd()
}

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
