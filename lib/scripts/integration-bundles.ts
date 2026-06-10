/**
 * Integration Bundles Configuration
 *
 * Defines which dependencies, folders, and files belong to each integration.
 * Used by the setup script to selectively remove unused integrations.
 *
 * Key types (`IntegrationId`, `RemovableId`) are imported from the registry so
 * that adding or renaming a key in one place without the other is a compile error.
 */

import type { RemovableId } from '@/integrations/registry'

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

/** Remove a `const NAME = …` variable statement by name (any scope depth). */
export interface RemoveVariableStatementOp {
  kind: 'removeVariableStatement'
  /** The variable name to remove, e.g. 'LazyGlobalCanvas' */
  name: string
}

/**
 * Remove a bare call-expression statement by its callee name, e.g. the whole
 * `useTheatre(sheet, 'fluid simulation', { … })` statement. Matches at any
 * scope depth; removes every occurrence in the file.
 */
export interface RemoveCallStatementOp {
  kind: 'removeCallStatement'
  /** The called identifier, e.g. 'useTheatre' */
  callee: string
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

/**
 * Remove an object element from an array property nested inside a named
 * variable declaration.  Designed for `images.remotePatterns` in next.config.ts.
 *
 * Matches an array element that is an object literal containing a property
 * whose name and string value both match the given `matchProperty`.
 */
export interface RemoveArrayObjectElementOp {
  kind: 'removeArrayObjectElement'
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'images.remotePatterns'`.
   */
  propertyPath: string
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** Property name + value that must be present on the target object element. */
  matchProperty: { name: string; value: string }
}

/**
 * Remove a string-literal element from an array property nested inside a named
 * variable declaration.  Designed for `experimental.optimizePackageImports`.
 */
export interface RemoveArrayStringElementOp {
  kind: 'removeArrayStringElement'
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'experimental.optimizePackageImports'`.
   */
  propertyPath: string
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /** The exact string value to remove from the array. */
  value: string
}

// ---------------------------------------------------------------------------
// Additive operations (inverse of the removals above)
// Every additive op is IDEMPOTENT: when the construct it would add is already
// present, the source text is returned byte-for-byte unchanged, so applying
// the same op twice is a no-op.
// ---------------------------------------------------------------------------

/**
 * Add a top-level import declaration, given as full source text.
 *
 * If an import with the same module specifier already exists, any missing
 * named imports are merged into it (no-op when all bindings are present).
 * Otherwise the declaration is inserted after the last existing import, e.g.
 * re-adding `import { Canvas } from '@/webgl/components/canvas'`.
 */
export interface AddImportOp {
  kind: 'addImport'
  /** Full import declaration text, e.g. `import { Canvas } from '@/webgl/components/canvas'` */
  text: string
}

/**
 * Append a string-literal element to an array property nested inside a named
 * variable declaration.  Inverse of `removeArrayStringElement`; designed for
 * `experimental.optimizePackageImports` in next.config.ts.
 *
 * No-op when an element with the same literal value already exists.
 */
export interface AddArrayStringElementOp {
  kind: 'addArrayStringElement'
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'experimental.optimizePackageImports'`.
   */
  propertyPath: string
  /** The string value to append to the array. */
  value: string
}

/**
 * Append an object-literal element to an array property nested inside a named
 * variable declaration.  Inverse of `removeArrayObjectElement`; designed for
 * `images.remotePatterns` in next.config.ts.
 *
 * No-op when an element already matches `matchProperty` (same matching
 * semantics as `removeArrayObjectElement`, including quoted-key
 * normalization).
 */
export interface AddArrayObjectElementOp {
  kind: 'addArrayObjectElement'
  /** The variable name that holds the object, e.g. `'nextConfig'`. */
  variableName: string
  /**
   * Dot-separated path from the variable declaration down to the array
   * property, e.g. `'images.remotePatterns'`.
   */
  propertyPath: string
  /** The object literal to append, as source text, e.g. `{ protocol: 'https', hostname: 'cdn.sanity.io' }` */
  objectText: string
  /** Property name + value identifying an already-present matching element. */
  matchProperty: { name: string; value: string }
}

/**
 * Insert a full variable statement, e.g. re-adding
 * `const LazyGlobalCanvas = dynamic(…)` to lib/features/index.tsx.
 *
 * No-op when a variable named `name` already exists anywhere in the file
 * (any scope depth, mirroring `removeVariableStatement`).
 */
export interface AddVariableStatementOp {
  kind: 'addVariableStatement'
  /** The declared variable name used for the idempotency check, e.g. 'LazyGlobalCanvas' */
  name: string
  /** Full statement text to insert, e.g. `const LazyGlobalCanvas = dynamic(() => …)` */
  text: string
  /**
   * When true or omitted, insert after the last import declaration.
   * When false, append at the end of the file.
   */
  afterImports?: boolean
}

/**
 * Append a JSX child as the last child of the first element whose opening tag
 * matches `parentTagName`, e.g. re-adding `<Canvas root />` inside <Wrapper>.
 *
 * No-op when any JSX element (or self-closing element) with tag
 * `childTagName` already exists anywhere in the file.
 */
export interface AddJsxChildOp {
  kind: 'addJsxChild'
  /** Tag name of the parent element to append into, e.g. 'Wrapper' */
  parentTagName: string
  /** The JSX child to append, as source text, e.g. `<Canvas root />` */
  childText: string
  /** Tag name of the child, used for the idempotency check, e.g. 'Canvas' */
  childTagName: string
}

export type AstOperation =
  | RemoveImportOp
  | RemoveVariableStatementOp
  | RemoveCallStatementOp
  | RemoveJsxElementOp
  | RemoveInterfacePropertyOp
  | RemoveFunctionParameterOp
  | ReplaceJsDocOp
  | RemoveArrayObjectElementOp
  | RemoveArrayStringElementOp
  | AddImportOp
  | AddArrayStringElementOp
  | AddArrayObjectElementOp
  | AddVariableStatementOp
  | AddJsxChildOp

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
  /** Environment variables this integration uses */
  envVars: string[]
  /** Barrel exports to update when this integration is removed */
  barrelExports: BarrelExport[]
  /** Code transformations to apply when this integration is removed */
  codeTransforms: CodeTransform[]
}

export const INTEGRATION_BUNDLES: Partial<
  Record<RemovableId, IntegrationBundle>
> = {
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
    codeTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          // Remove cdn.sanity.io from images.remotePatterns
          {
            kind: 'removeArrayObjectElement',
            variableName: 'nextConfig',
            propertyPath: 'images.remotePatterns',
            matchProperty: { name: 'hostname', value: 'cdn.sanity.io' },
          },
          // Remove @sanity/* packages from experimental.optimizePackageImports
          {
            kind: 'removeArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@sanity/client',
          },
          {
            kind: 'removeArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@sanity/image-url',
          },
          {
            kind: 'removeArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@sanity/asset-utils',
          },
          {
            kind: 'removeArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@portabletext/react',
          },
        ],
      },
    ],
  },

  shopify: {
    name: 'Shopify',
    description: 'E-commerce platform integration with cart and checkout',
    dependencies: [],
    devDependencies: [],
    folders: ['lib/integrations/shopify'],
    files: [],
    envVars: [
      'SHOPIFY_STORE_DOMAIN',
      'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
      'SHOPIFY_CUSTOMER_ACCOUNT_API_CLIENT_ID',
      'SHOPIFY_CUSTOMER_ACCOUNT_API_URL',
    ],
    barrelExports: [],
    codeTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          // Remove cdn.shopify.com from images.remotePatterns
          {
            kind: 'removeArrayObjectElement',
            variableName: 'nextConfig',
            propertyPath: 'images.remotePatterns',
            matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
          },
        ],
      },
    ],
  },

  hubspot: {
    name: 'HubSpot',
    description: 'Marketing forms and newsletter integration',
    dependencies: [],
    devDependencies: [],
    folders: ['lib/integrations/hubspot'],
    files: [],
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
    dependencies: ['@react-three/drei', '@react-three/fiber', 'three'],
    devDependencies: ['@types/three'],
    folders: ['lib/webgl', 'components/effects/animated-gradient'],
    files: [],
    envVars: [],
    barrelExports: [
      { file: 'components/effects/index.ts', pattern: 'animated-gradient' },
    ],
    codeTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          // Remove WebGL/Three.js packages from experimental.optimizePackageImports
          {
            kind: 'removeArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@react-three/drei',
          },
          {
            kind: 'removeArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@react-three/fiber',
          },
          {
            kind: 'removeArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: 'three',
          },
        ],
      },
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
    dependencies: ['@theatre/core'],
    devDependencies: ['@theatre/studio'],
    folders: ['lib/dev/theatre', 'public/config'],
    files: [],
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
      // The webgl fluid/flowmap hooks ship with optional Theatre.js debug
      // controls. Strip that wiring so webgl keeps working without theatre.
      {
        file: 'lib/webgl/utils/fluid/index.tsx',
        ops: [
          { kind: 'removeCallStatement', callee: 'useTheatre' },
          { kind: 'removeVariableStatement', name: 'sheet' },
          { kind: 'removeImport', specifier: '@theatre/core' },
          { kind: 'removeImport', specifier: '@/dev/theatre' },
          {
            kind: 'removeImport',
            specifier: '@/dev/theatre/hooks/use-theatre',
          },
        ],
      },
      {
        file: 'lib/webgl/utils/flowmaps/index.tsx',
        ops: [
          { kind: 'removeCallStatement', callee: 'useTheatre' },
          { kind: 'removeVariableStatement', name: 'sheet' },
          { kind: 'removeImport', specifier: '@theatre/core' },
          { kind: 'removeImport', specifier: '@/dev/theatre' },
          {
            kind: 'removeImport',
            specifier: '@/dev/theatre/hooks/use-theatre',
          },
        ],
      },
    ],
  },
}

/**
 * Get all removable integration ids (keys of INTEGRATION_BUNDLES, including
 * dev-only removables like webgl and theatre).
 */
export const getIntegrationNames = (): RemovableId[] =>
  Object.keys(INTEGRATION_BUNDLES) as RemovableId[]

/** Typed entries of INTEGRATION_BUNDLES (defined keys only). */
export const getIntegrationEntries = (): [RemovableId, IntegrationBundle][] =>
  Object.entries(INTEGRATION_BUNDLES) as [RemovableId, IntegrationBundle][]
