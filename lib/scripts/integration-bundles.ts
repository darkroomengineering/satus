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

// ---------------------------------------------------------------------------
// Typed AST operation union
// Each variant is resilient to whitespace / formatting changes because it
// targets named constructs (imports, variables, JSX tags) rather than text.
// ---------------------------------------------------------------------------

/** Remove a top-level import declaration by its module specifier. */
export interface RemoveImportOp {
  kind: 'removeImport'
  /** The module specifier string to match exactly, e.g. '@/webgl/components/canvas' */
  specifier: string
}

/** Remove a top-level `const NAME = …` variable statement by name. */
export interface RemoveVariableStatementOp {
  kind: 'removeVariableStatement'
  /** The variable name to remove, e.g. 'LazyGlobalCanvas' */
  name: string
}

/**
 * Remove (or unwrap) a JSX element by its tag name.
 *
 * - `attribute` — optional {name, value} pair that must match to disambiguate
 *   elements sharing the same tag (e.g. OrchestraToggle with id="webgl").
 * - `unwrap` — when true, keep the element's children and remove only the
 *   opening / closing tags (e.g. strip <Canvas> but keep its content).
 */
export interface RemoveJsxElementOp {
  kind: 'removeJsxElement'
  /** JSX tag name, e.g. 'LazyGlobalCanvas', 'Canvas', 'OrchestraToggle' */
  tagName: string
  /** Optional attribute to match for disambiguation */
  attribute?: { name: string; value: string }
  /** When true, keep children and remove only the tags */
  unwrap?: boolean
}

/** Remove a property (with its leading JSDoc) from a named interface. */
export interface RemoveInterfacePropertyOp {
  kind: 'removeInterfaceProperty'
  /** Interface name, e.g. 'WrapperProps' */
  interfaceName: string
  /** Property name, e.g. 'webgl' */
  propertyName: string
}

/** Remove a named parameter from a function's destructured props argument. */
export interface RemoveFunctionParameterOp {
  kind: 'removeFunctionParameter'
  /** Exported function name, e.g. 'Wrapper' */
  functionName: string
  /** Parameter name as it appears in the destructured binding, e.g. 'webgl' */
  parameterName: string
}

/**
 * Replace the entire JSDoc block on a named function with a provided string.
 * Used when multiple partial-text edits to the JSDoc would be brittle; a full
 * replacement is simpler and guarantees the result is well-formed.
 */
export interface ReplaceJsDocOp {
  kind: 'replaceJsDoc'
  /** Name of the function whose JSDoc to replace */
  functionName: string
  /** The replacement JSDoc text (must include /** … * /) */
  replacement: string
}

export type AstOperation =
  | RemoveImportOp
  | RemoveVariableStatementOp
  | RemoveJsxElementOp
  | RemoveInterfacePropertyOp
  | RemoveFunctionParameterOp
  | ReplaceJsDocOp

export interface CodeTransform {
  /** Path to the file to transform (relative to project root) */
  file: string
  /** Typed AST operations to apply */
  ops: AstOperation[]
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
    folders: ['lib/integrations/sanity', 'components/ui/sanity-image'],
    files: [],
    configPatterns: ['cdn.sanity.io', '@sanity'],
    envVars: [
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'NEXT_PUBLIC_SANITY_API_READ_TOKEN',
      'SANITY_API_READ_TOKEN',
      'SANITY_PRIVATE_TOKEN',
      'SANITY_API_WRITE_TOKEN',
      'SANITY_STUDIO_PROJECT_ID',
      'SANITY_REVALIDATE_SECRET',
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
    folders: ['lib/integrations/shopify'],
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
    devDependencies: [],
    folders: ['lib/integrations/hubspot'],
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
    folders: ['lib/webgl', 'components/effects/animated-gradient'],
    files: [],
    configPatterns: ['@react-three', 'three', 'postprocessing'],
    envVars: [],
    barrelExports: [
      { file: 'components/effects/index.ts', pattern: 'animated-gradient' },
    ],
    codeTransforms: [
      {
        file: 'lib/features/index.tsx',
        ops: [
          // Remove `const LazyGlobalCanvas = dynamic(…)`
          { kind: 'removeVariableStatement', name: 'LazyGlobalCanvas' },
          // Remove `<LazyGlobalCanvas />` (and its preceding JSX comment)
          { kind: 'removeJsxElement', tagName: 'LazyGlobalCanvas' },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        ops: [
          // Remove only the webgl OrchestraToggle (disambiguate by id attr)
          {
            kind: 'removeJsxElement',
            tagName: 'OrchestraToggle',
            attribute: { name: 'id', value: 'webgl' },
          },
        ],
      },
      {
        file: 'components/layout/wrapper/index.tsx',
        ops: [
          // Remove `import { Canvas } from '@/webgl/components/canvas'`
          {
            kind: 'removeImport',
            specifier: '@/webgl/components/canvas',
          },
          // Remove `webgl?: boolean` from WrapperProps interface
          {
            kind: 'removeInterfaceProperty',
            interfaceName: 'WrapperProps',
            propertyName: 'webgl',
          },
          // Remove `webgl = false` from the Wrapper function destructured params
          {
            kind: 'removeFunctionParameter',
            functionName: 'Wrapper',
            parameterName: 'webgl',
          },
          // Unwrap <Canvas root={webgl}>…</Canvas> (keep children)
          {
            kind: 'removeJsxElement',
            tagName: 'Canvas',
            unwrap: true,
          },
          // Replace the full JSDoc on Wrapper with a WebGL-free version.
          // A single replacement is safer than multiple partial-text edits on the
          // JSDoc because ts-morph's description/tag APIs require exact tag shapes,
          // and the block mixes freeform paragraphs with @param/@example tags.
          {
            kind: 'replaceJsDoc',
            functionName: 'Wrapper',
            replacement: `/**
 * Main page wrapper component providing theme and smooth scrolling.
 *
 * This component serves as the root container for pages, automatically handling
 * theme application, smooth scrolling, and layout structure.
 * It includes navigation and footer.
 *
 * @param props - Component props
 * @param props.theme - Color theme to apply to the page
 * @param props.lenis - Whether to enable smooth scrolling with Lenis
 * @param props.children - Page content
 * @param props.className - Additional CSS classes
 *
 * @example
 * \`\`\`tsx
 * // Basic usage with theme
 * export default function Page() {
 *   return (
 *     <Wrapper theme="dark">
 *       <section>My page content</section>
 *     </Wrapper>
 *   )
 * }
 * \`\`\`
 *
 * @example
 * \`\`\`tsx
 * // Disable smooth scrolling
 * export default function StaticPage() {
 *   return (
 *     <Wrapper lenis={false}>
 *       <section>Content without smooth scroll</section>
 *     </Wrapper>
 *   )
 * }
 * \`\`\`
 */`,
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
        ops: [
          // Remove `const Studio = dynamic(…)` variable declaration
          { kind: 'removeVariableStatement', name: 'Studio' },
          // Remove `{studio && <Studio />}` JSX expression
          { kind: 'removeJsxElement', tagName: 'Studio' },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        ops: [
          // Remove only the studio OrchestraToggle (disambiguate by id attr)
          {
            kind: 'removeJsxElement',
            tagName: 'OrchestraToggle',
            attribute: { name: 'id', value: 'studio' },
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
