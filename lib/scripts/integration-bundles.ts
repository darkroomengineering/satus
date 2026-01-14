/**
 * Integration Bundles Configuration
 *
 * Defines which dependencies, folders, and files belong to each integration.
 * Used by the setup script to selectively remove unused integrations.
 */

export interface BarrelExport {
  /** Path to the barrel export file (e.g., 'components/ui/index.ts') */
  file: string
  /** Pattern to match export lines to remove (e.g., 'sanity-image') */
  pattern: string
}

export interface CodeTransform {
  /** Path to the file to transform */
  file: string
  /** Regex patterns to remove from the file (with flags) */
  patterns: Array<{
    /** The regex pattern as a string */
    regex: string
    /** Regex flags (e.g., 'gm' for global multiline) */
    flags: string
  }>
}

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
  /** Barrel exports to update when this integration is removed */
  barrelExports: BarrelExport[]
  /** Code transformations to apply when this integration is removed */
  codeTransforms: CodeTransform[]
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
    folders: [
      'lib/integrations/sanity',
      'app/studio',
      'app/(examples)/sanity',
      'components/ui/sanity-image',
    ],
    files: [],
    configPatterns: ['cdn.sanity.io', '@sanity'],
    envVars: [
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'NEXT_PUBLIC_SANITY_STUDIO_URL',
      'SANITY_API_WRITE_TOKEN',
    ],
    barrelExports: [
      { file: 'components/ui/index.ts', pattern: 'sanity-image' },
    ],
    codeTransforms: [],
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
    barrelExports: [],
    codeTransforms: [],
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
    barrelExports: [],
    codeTransforms: [],
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
    barrelExports: [],
    codeTransforms: [],
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
    barrelExports: [],
    codeTransforms: [],
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
    folders: [
      'lib/webgl',
      'app/(examples)/r3f',
      'components/effects/animated-gradient',
    ],
    files: [],
    configPatterns: ['@react-three', 'three', 'postprocessing'],
    envVars: [],
    barrelExports: [
      { file: 'components/effects/index.ts', pattern: 'animated-gradient' },
    ],
    codeTransforms: [
      {
        file: 'lib/features/index.tsx',
        patterns: [
          // Remove the LazyGlobalCanvas import
          {
            regex:
              'const LazyGlobalCanvas = dynamic\\([\\s\\S]*?\\{ ssr: false \\}\\s*\\)\\s*',
            flags: 'gm',
          },
          // Remove the hasWebGL constant
          {
            regex:
              "const hasWebGL = Boolean\\(process\\.env\\.NEXT_PUBLIC_ENABLE_WEBGL !== 'false'\\)\\n",
            flags: 'gm',
          },
          // Remove the WebGL component push block (with surrounding newlines)
          {
            regex:
              '\\n\\s*// WebGL Canvas - only if WebGL is enabled\\n\\s*if \\(hasWebGL\\) \\{\\n\\s*components\\.push\\(<LazyGlobalCanvas key="webgl" />\\)\\n\\s*\\}',
            flags: 'gm',
          },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        patterns: [
          // Remove the webgl toggle
          {
            regex:
              '\\s*<OrchestraToggle id="webgl" defaultValue=\\{true\\}>\\s*🧊\\s*</OrchestraToggle>',
            flags: 'gm',
          },
        ],
      },
      {
        file: 'components/layout/wrapper/index.tsx',
        patterns: [
          // Remove Canvas import
          {
            regex: "import \\{ Canvas \\} from '@/webgl/components/canvas'\\n",
            flags: 'gm',
          },
          // Remove webgl prop JSDoc comment
          {
            regex:
              '\\n  /\\*\\*\\n   \\* Enable WebGL for this page\\.[\\s\\S]*?\\*/\\n  webgl\\?: boolean',
            flags: 'gm',
          },
          // Remove webgl param from function
          {
            regex: '\\n  webgl = false,',
            flags: 'gm',
          },
          // Replace <Canvas root={webgl}> with nothing (keep children)
          {
            regex: '<Canvas root=\\{webgl\\}>',
            flags: 'gm',
          },
          // Replace </Canvas> with nothing
          {
            regex: '</Canvas>',
            flags: 'gm',
          },
          // Remove WebGL example from JSDoc
          {
            regex:
              '\\n \\* @example\\n \\* ```tsx\\n \\* // With WebGL content[\\s\\S]*?\\* ```',
            flags: 'gm',
          },
          // Remove @param webgl line
          {
            regex:
              '\\n \\* @param props\\.webgl - Whether to activate WebGL for this page',
            flags: 'gm',
          },
          // Remove WebGL benefits documentation block
          {
            regex:
              "\\n \\* When `webgl` is true[\\s\\S]*?\\* - \\*\\*Zero overhead\\*\\*: Non-WebGL pages don't trigger any WebGL code",
            flags: 'gm',
          },
          // Clean up JSDoc title (remove ", and WebGL")
          {
            regex: ', and WebGL',
            flags: 'gm',
          },
        ],
      },
    ],
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
    barrelExports: [],
    codeTransforms: [
      {
        file: 'lib/dev/index.tsx',
        patterns: [
          // Remove the Studio import
          {
            regex:
              '// Dynamically load debug tools\\s*const Studio = dynamic\\([\\s\\S]*?\\{ ssr: false \\}\\s*\\)\\s*',
            flags: 'gm',
          },
          // Remove the Studio render
          {
            regex: '\\s*\\{studio && <Studio />\\}',
            flags: 'gm',
          },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        patterns: [
          // Remove the studio toggle
          {
            regex: '\\s*<OrchestraToggle id="studio">⚙️</OrchestraToggle>',
            flags: 'gm',
          },
        ],
      },
    ],
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
