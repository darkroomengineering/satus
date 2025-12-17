/**
 * Integration Bundles Configuration
 *
 * Defines which dependencies, folders, and files belong to each integration.
 * Used by the setup script to selectively remove unused integrations.
 */

export interface IntegrationBundle {
  name: string
  description: string
  /** Dependencies to remove from package.json */
  dependencies: string[]
  /** Dev dependencies to remove from package.json */
  devDependencies: string[]
  /** Folders to remove */
  folders: string[]
  /** Individual files to remove */
  files: string[]
  /** Patterns to check in next.config.ts (for manual cleanup hints) */
  configPatterns: string[]
  /** Environment variables this integration uses */
  envVars: string[]
}

export const INTEGRATION_BUNDLES: Record<string, IntegrationBundle> = {
  sanity: {
    name: 'Sanity CMS',
    description: 'Headless CMS with visual editing and real-time collaboration',
    dependencies: [
      '@portabletext/react',
      '@sanity/asset-utils',
      '@sanity/image-url',
      '@sanity/visual-editing',
      'next-sanity',
    ],
    devDependencies: ['@sanity/vision', 'sanity'],
    folders: ['lib/integrations/sanity', 'app/studio', 'app/(examples)/sanity'],
    files: ['components/ui/sanity-image/index.tsx'],
    configPatterns: ['cdn.sanity.io', '@sanity'],
    envVars: [
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'NEXT_PUBLIC_SANITY_STUDIO_URL',
      'SANITY_API_WRITE_TOKEN',
    ],
  },

  shopify: {
    name: 'Shopify',
    description: 'E-commerce platform integration with cart and checkout',
    dependencies: [],
    devDependencies: [],
    folders: ['lib/integrations/shopify', 'app/(examples)/shopify'],
    files: [],
    configPatterns: ['cdn.shopify.com'],
    envVars: [
      'SHOPIFY_STORE_DOMAIN',
      'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
      'SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID',
      'SHOPIFY_CUSTOMER_ACCOUNT_API_URL',
    ],
  },

  hubspot: {
    name: 'HubSpot',
    description: 'Marketing forms and newsletter integration',
    dependencies: [],
    devDependencies: ['@hubspot/api-client'],
    folders: ['lib/integrations/hubspot', 'app/(examples)/hubspot'],
    files: [],
    configPatterns: [],
    envVars: ['HUBSPOT_ACCESS_TOKEN', 'NEXT_PUBLIC_HUBSPOT_PORTAL_ID'],
  },

  mailchimp: {
    name: 'Mailchimp',
    description: 'Email marketing and newsletter subscriptions',
    dependencies: [],
    devDependencies: [],
    folders: ['lib/integrations/mailchimp'],
    files: [],
    configPatterns: [],
    envVars: [
      'MAILCHIMP_API_KEY',
      'MAILCHIMP_SERVER_PREFIX',
      'MAILCHIMP_AUDIENCE_ID',
    ],
  },

  mandrill: {
    name: 'Mandrill',
    description: 'Transactional email service',
    dependencies: [],
    devDependencies: [],
    folders: ['lib/integrations/mandrill'],
    files: [],
    configPatterns: [],
    envVars: ['MANDRILL_API_KEY'],
  },

  webgl: {
    name: 'WebGL / 3D',
    description: 'Three.js and React Three Fiber for 3D graphics',
    dependencies: [
      '@react-three/drei',
      '@react-three/fiber',
      'postprocessing',
      'three',
      'tunnel-rat',
    ],
    devDependencies: ['@types/three'],
    folders: ['lib/webgl', 'app/(examples)/r3f'],
    files: ['components/effects/animated-gradient/webgl.tsx'],
    configPatterns: ['@react-three', 'three', 'postprocessing'],
    envVars: [],
  },

  theatre: {
    name: 'Theatre.js',
    description: 'Animation debugging and timeline editor',
    dependencies: [],
    devDependencies: ['@theatre/core', '@theatre/studio'],
    folders: ['lib/dev/theatre', 'public/config'],
    files: [],
    configPatterns: [],
    envVars: [],
  },
}

/**
 * Get all integration names
 */
export const getIntegrationNames = () => Object.keys(INTEGRATION_BUNDLES)

/**
 * Get bundle by name
 */
export const getBundle = (name: string) => INTEGRATION_BUNDLES[name]

/**
 * Get all dependencies for selected integrations
 */
export const getDependenciesForIntegrations = (integrations: string[]) => {
  const deps = new Set<string>()
  const devDeps = new Set<string>()

  for (const name of integrations) {
    const bundle = INTEGRATION_BUNDLES[name]
    if (bundle) {
      for (const dep of bundle.dependencies) deps.add(dep)
      for (const dep of bundle.devDependencies) devDeps.add(dep)
    }
  }

  return { dependencies: [...deps], devDependencies: [...devDeps] }
}
