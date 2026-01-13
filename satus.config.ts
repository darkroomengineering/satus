/**
 * Satus Configuration
 *
 * Central configuration for Satus starter features and customization boundaries.
 * This file is safe to modify for your project needs.
 *
 * @category project-config
 * @modification-level full
 */

export interface SatusConfig {
  /** Core feature toggles */
  features: {
    /** Enable WebGL/3D capabilities */
    webgl: boolean
    /** Enable Sanity CMS integration */
    sanity: boolean
    /** Enable Shopify ecommerce integration */
    shopify: boolean
    /** Enable HubSpot marketing integration */
    hubspot: boolean
    /** Enable development tools and debug features */
    devTools: boolean
    /** Enable smooth scrolling with Lenis */
    smoothScrolling: boolean
    /** Enable GSAP animations */
    animations: boolean
  }

  /** Theme and styling configuration */
  theme: {
    /** Color scheme approach */
    colors: 'default' | 'custom'
    /** Typography system */
    typography: 'default' | 'custom'
    /** Animation library preference */
    animations: 'gsap' | 'css' | 'none'
    /** Default theme for pages */
    defaultTheme: 'dark' | 'light'
  }

  /** Component overrides - specify custom component paths */
  components?: {
    /** Custom header component path */
    header?: string
    /** Custom footer component path */
    footer?: string
    /** Custom wrapper component path */
    wrapper?: string
  }

  /** Starter code preservation settings */
  preserve: {
    /** Preserve core utility functions */
    coreUtils: boolean
    /** Preserve base UI component structure */
    baseComponents: boolean
    /** Preserve integration templates */
    integrations: boolean
    /** Preserve build and setup scripts */
    scripts: boolean
  }

  /** Development settings */
  development?: {
    /** Show visual boundary indicators */
    showBoundaries?: boolean
    /** Validate boundary modifications */
    strictBoundaries?: boolean
    /** Enable component development tools */
    componentDevTools?: boolean
  }
}

/**
 * Default Satus configuration
 *
 * Modify these values to customize your project:
 * - Enable/disable features based on your needs
 * - Customize theme and styling preferences
 * - Override components with your custom versions
 * - Configure development tools and boundaries
 */
const config: SatusConfig = {
  // Core Features - Enable what your project needs
  features: {
    webgl: true, // 3D graphics and animations
    sanity: true, // Content management system
    shopify: false, // E-commerce capabilities
    hubspot: false, // Marketing automation
    devTools: true, // Development helpers
    smoothScrolling: true, // Lenis smooth scroll
    animations: true, // GSAP animation library
  },

  // Theme Configuration - Customize your visual identity
  theme: {
    colors: 'default', // Use default color palette
    typography: 'default', // Use default typography scale
    animations: 'gsap', // Use GSAP for animations
    defaultTheme: 'dark', // Default page theme
  },

  // Component Overrides - Uncomment and specify paths to use custom components
  components: {
    // header: 'project/components/custom-header',
    // footer: 'project/components/custom-footer',
    // wrapper: 'project/components/custom-wrapper',
  },

  // Preservation Settings - Keep starter code upgradeable
  preserve: {
    coreUtils: true, // Keep core utilities intact
    baseComponents: true, // Preserve base component structure
    integrations: true, // Keep integration templates
    scripts: true, // Preserve build/setup scripts
  },

  // Development Settings
  development: {
    showBoundaries: process.env.NODE_ENV === 'development',
    strictBoundaries: false,
    componentDevTools: true,
  },
}

export default config
