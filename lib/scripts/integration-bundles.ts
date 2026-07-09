/**
 * Integration Bundles Configuration
 *
 * Defines which dependencies, folders, and files belong to each integration.
 * Used by the setup script to selectively remove unused integrations, and by
 * the `satus add` CLI to restore them additively from the public satus repo.
 *
 * Key types (`IntegrationId`, `RemovableId`) are imported from the registry so
 * that adding or renaming a key in one place without the other is a compile error.
 */

import type { RemovableId } from '@/integrations/registry'
import type { CodeTransform } from './ast-operation-types'

// Re-export the AST-operation type system so existing importers that pull
// these types from './integration-bundles' continue to compile unchanged.
export type {
  AddArrayObjectElementOp,
  AddArrayStringElementOp,
  AddImportOp,
  AddJsxChildOp,
  AddVariableStatementOp,
  AstOperation,
  CodeTransform,
  RemoveArrayObjectElementOp,
  RemoveArrayStringElementOp,
  RemoveCallArgumentOp,
  RemoveCallStatementOp,
  RemoveDestructuredBindingOp,
  RemoveFunctionParameterOp,
  RemoveIfStatementOp,
  RemoveImportOp,
  RemoveInterfacePropertyOp,
  RemoveJsxAttributeOp,
  RemoveJsxElementOp,
  RemoveVariableStatementOp,
  ReplaceJsDocOp,
} from './ast-operation-types'

export interface BarrelExport {
  /** Path to the barrel export file (e.g., 'components/ui/index.ts') */
  file: string
  /** Pattern to match export lines to remove (e.g., 'sanity-image') */
  pattern: string
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
  /**
   * Other integrations this one depends on. `satus add` resolves these
   * transitively and installs dependencies first (e.g. theatre requires
   * webgl for its r3f bindings and the webgl-hook wiring).
   */
  requires?: RemovableId[]
  /**
   * Additive code transformations applied by `satus add` — the inverse of
   * `codeTransforms`, built exclusively from the idempotent add* operations.
   */
  addTransforms?: CodeTransform[]
  /**
   * Integration-owned files copied wholesale from the payload source on
   * `satus add`, used where statement-level re-injection would be brittle
   * (e.g. the Theatre wiring inside the webgl fluid/flowmap hooks, or the
   * webgl Canvas wiring in the Wrapper). A local file is only overwritten
   * when it matches the payload version (no-op) or the expected lean state
   * (payload with this bundle's removal ops applied); anything else is
   * treated as locally modified and skipped with a warning unless --force.
   */
  overwriteFiles?: string[]
}

// Keep bundle keys literal (so `BundleId` stays exact) while typing every value
// as the full `IntegrationBundle`. A bare `satisfies` narrows each value to its
// own literal and drops optional fields such as `requires`, breaking
// `INTEGRATION_BUNDLES[id].requires` access.
const defineBundles = <K extends string>(
  bundles: Record<K, IntegrationBundle>
): Record<K, IntegrationBundle> => bundles

export const INTEGRATION_BUNDLES = defineBundles({
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
    files: ['app/api/draft-mode/enable/route.ts'],
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
        file: 'app/layout.tsx',
        ops: [
          // Remove `import { SanityLive } from '@/lib/integrations/sanity/live'`
          { kind: 'removeImport', specifier: '@/lib/integrations/sanity/live' },
          // Remove `{sanityConfigured && <SanityLive />}` JSX element
          { kind: 'removeJsxElement', tagName: 'SanityLive' },
          // Remove `{sanityConfigured && isDraftMode && (<Suspense>…<VisualEditing/></Suspense>)}`
          // VisualEditing is from next-sanity, already handled by removing the import below,
          // but we also remove the JSX element to avoid the dangling reference.
          { kind: 'removeJsxElement', tagName: 'VisualEditing' },
          // Remove `import { VisualEditing } from 'next-sanity/visual-editing'`
          {
            kind: 'removeImport',
            specifier: 'next-sanity/visual-editing',
          },
          // Remove `const sanityConfigured = isConfigured('sanity')` variable
          // (no longer used after the two sanity JSX blocks are removed)
          { kind: 'removeVariableStatement', name: 'sanityConfigured' },
          // Remove `import { isConfigured } from '@/lib/integrations/registry'`
          // (only used for sanityConfigured in layout.tsx — now unused)
          { kind: 'removeImport', specifier: '@/lib/integrations/registry' },
        ],
      },
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
    // app/layout.tsx has complex Sanity wiring (SanityLive, VisualEditing,
    // isConfigured call) that cannot be re-injected statement-by-statement
    // safely.  Restore wholesale from the payload on `satus add sanity`.
    overwriteFiles: ['app/layout.tsx'],
    addTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          // Re-add cdn.sanity.io to images.remotePatterns
          {
            kind: 'addArrayObjectElement',
            variableName: 'nextConfig',
            propertyPath: 'images.remotePatterns',
            objectText: "{ protocol: 'https', hostname: 'cdn.sanity.io' }",
            matchProperty: { name: 'hostname', value: 'cdn.sanity.io' },
          },
          // Re-add @sanity/* packages to experimental.optimizePackageImports
          {
            kind: 'addArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@sanity/client',
          },
          {
            kind: 'addArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@sanity/image-url',
          },
          {
            kind: 'addArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@sanity/asset-utils',
          },
          {
            kind: 'addArrayStringElement',
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
      // app/api/revalidate/route.ts is a SHARED core route (not deleted by any
      // bundle's `folders`/`files` — Sanity's revalidation logic in the same
      // file has no bundle ownership either). Only Shopify currently wires
      // anything into it, so stripping Shopify must remove exactly its own
      // import + guard dispatch and nothing else.
      {
        file: 'app/api/revalidate/route.ts',
        ops: [
          // Remove `import { revalidate as shopifyRevalidate } from '@/integrations/shopify/revalidate'`
          {
            kind: 'removeImport',
            specifier: '@/integrations/shopify/revalidate',
          },
          // Remove `const isShopifyWebhook = request.headers.has(…) || …`
          {
            kind: 'removeVariableStatement',
            name: 'isShopifyWebhook',
          },
          // Remove `if (isShopifyWebhook) { return shopifyRevalidate(request) }`
          {
            kind: 'removeIfStatement',
            conditionContains: 'isShopifyWebhook',
          },
        ],
      },
    ],
    // The Shopify webhook dispatch (import + guard variable + if-statement)
    // lives inside the exported `POST` function body, not at the top level —
    // none of the existing additive ops can re-insert a statement mid-function,
    // so the file is restored wholesale on `satus add shopify`, guarded by the
    // lean-state comparison documented on `overwriteFiles`. Safe because no
    // other bundle currently owns any part of this file (see codeTransforms
    // comment above) — the "expected lean" check only ever compares against
    // Shopify's own removal ops.
    overwriteFiles: ['app/api/revalidate/route.ts'],
    addTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          // Re-add cdn.shopify.com to images.remotePatterns
          {
            kind: 'addArrayObjectElement',
            variableName: 'nextConfig',
            propertyPath: 'images.remotePatterns',
            objectText: "{ protocol: 'https', hostname: 'cdn.shopify.com' }",
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
    folders: ['lib/webgl'],
    files: ['lib/hooks/use-device-detection.ts'],
    envVars: [],
    barrelExports: [
      // Remove the useDeviceDetection re-export — the hook is webgl-owned
      { file: 'lib/hooks/index.ts', pattern: 'use-device-detection' },
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
          // Remove `const LazyWebGLCanvas = dynamic(…)` (the root canvas mount)
          { kind: 'removeVariableStatement', name: 'LazyWebGLCanvas' },
          // Remove `<LazyWebGLCanvas root />` (and its preceding JSX comment)
          { kind: 'removeJsxElement', tagName: 'LazyWebGLCanvas' },
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
    // The Wrapper's Canvas wiring (import + interface property + destructured
    // param + <Canvas> wrapping <main> + JSDoc) cannot be expressed additively —
    // re-wrapping children and restoring interface members would need bespoke
    // ops — so the file is restored wholesale, guarded by the lean-state
    // comparison documented on `overwriteFiles`.
    overwriteFiles: [
      'components/layout/wrapper/index.tsx',
      'lib/hooks/use-device-detection.ts',
    ],
    addTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          // Re-add WebGL/Three.js packages to experimental.optimizePackageImports
          {
            kind: 'addArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@react-three/drei',
          },
          {
            kind: 'addArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: '@react-three/fiber',
          },
          {
            kind: 'addArrayStringElement',
            variableName: 'nextConfig',
            propertyPath: 'experimental.optimizePackageImports',
            value: 'three',
          },
        ],
      },
      {
        file: 'lib/features/index.tsx',
        ops: [
          // Ensure the dynamic() helper import is present
          { kind: 'addImport', text: "import dynamic from 'next/dynamic'" },
          // Re-add `const LazyWebGLCanvas = dynamic(…)` (the root canvas mount)
          {
            kind: 'addVariableStatement',
            name: 'LazyWebGLCanvas',
            text: `const LazyWebGLCanvas = dynamic(
  () =>
    import('@/webgl/components/canvas').then((mod) => ({
      default: mod.Canvas,
    })),
  { ssr: false }
)`,
          },
          // Re-add `<LazyWebGLCanvas root />` inside the OptionalFeatures fragment
          {
            kind: 'addJsxChild',
            parentTagName: 'Fragment',
            childText: '<LazyWebGLCanvas root />',
            childTagName: 'LazyWebGLCanvas',
          },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        ops: [
          // Re-add the webgl OrchestraToggle next to the other toggles
          {
            kind: 'addJsxChild',
            parentTagName: 'div',
            childText:
              '<OrchestraToggle id="webgl" defaultValue={true}>🧊</OrchestraToggle>',
            childTagName: 'OrchestraToggle',
            childAttribute: { name: 'id', value: 'webgl' },
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
          // Remove `studio` from `const { stats, grid, studio, … } = useOrchestra()`
          // After the JSX element is gone, `studio` is declared but never read (TS6133).
          {
            kind: 'removeDestructuredBinding',
            bindingName: 'studio',
            initializerContains: 'useOrchestra',
          },
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
      // The canvas wraps its scene in <SheetProvider> (Theatre's sheet) and the
      // tunnel bridges Theatre's SheetContext into r3f. Strip both so the webgl
      // canvas mounts without theatre.
      {
        file: 'lib/webgl/components/canvas/webgl.tsx',
        ops: [
          { kind: 'removeImport', specifier: '@/lib/dev/theatre' },
          // Unwrap <SheetProvider id="webgl">…</SheetProvider> (keep the scene)
          { kind: 'removeJsxElement', tagName: 'SheetProvider', unwrap: true },
        ],
      },
      {
        file: 'lib/webgl/components/tunnel/index.tsx',
        ops: [
          { kind: 'removeImport', specifier: '@/lib/dev/theatre' },
          // useContextBridge(TransformContext, SheetContext) → (TransformContext)
          {
            kind: 'removeCallArgument',
            callee: 'useContextBridge',
            argument: 'SheetContext',
          },
        ],
      },
    ],
    // The r3f bindings and the webgl-hook wiring below depend on webgl.
    requires: ['webgl'],
    // The webgl Theatre wiring (sheet const + useTheatre in the hooks, the
    // <SheetProvider> in the canvas, the SheetContext bridge in the tunnel) is
    // not re-injectable statement-by-statement, so these files are restored
    // wholesale from the payload on `satus add theatre`.
    // lib/dev/index.tsx carries the `studio` destructured binding that the
    // removeDestructuredBinding op strips; restore it wholesale on `satus add`.
    // lib/dev/cmdo.tsx carries the studio OrchestraToggle; restore wholesale too.
    overwriteFiles: [
      'lib/webgl/utils/fluid/index.tsx',
      'lib/webgl/utils/flowmaps/index.tsx',
      'lib/webgl/components/canvas/webgl.tsx',
      'lib/webgl/components/tunnel/index.tsx',
      'lib/dev/index.tsx',
      'lib/dev/cmdo.tsx',
    ],
    addTransforms: [
      {
        file: 'lib/dev/index.tsx',
        ops: [
          // Ensure the dynamic() helper import is present
          { kind: 'addImport', text: "import dynamic from 'next/dynamic'" },
          // Re-add `const Studio = dynamic(…)`
          {
            kind: 'addVariableStatement',
            name: 'Studio',
            text: `const Studio = dynamic(
  () => import('./theatre/studio').then(({ Studio }) => Studio),
  { ssr: false }
)`,
          },
          // Re-add `{studio && <Studio />}` inside the OrchestraTools fragment
          // (`studio` still comes from the useOrchestra() destructuring, which
          // the removal ops leave in place)
          {
            kind: 'addJsxChild',
            parentTagName: 'Fragment',
            childText: '{studio && <Studio />}',
            childTagName: 'Studio',
          },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        ops: [
          // Re-add the studio OrchestraToggle next to the other toggles
          {
            kind: 'addJsxChild',
            parentTagName: 'div',
            childText: '<OrchestraToggle id="studio">⚙️</OrchestraToggle>',
            childTagName: 'OrchestraToggle',
            childAttribute: { name: 'id', value: 'studio' },
          },
        ],
      },
    ],
  },
})

/**
 * The union of keys that have an actual bundle definition. A strict subset of
 * RemovableId (which also includes 'turnstile' and 'analytics' from the
 * runtime registry that have no removable bundle).
 */
export type BundleId = keyof typeof INTEGRATION_BUNDLES

/**
 * Compile-time guard: BundleId must remain a subset of RemovableId. When a
 * key is added to INTEGRATION_BUNDLES that isn't in RemovableId, this type
 * becomes `never`, surfacing a TS error immediately.
 * Exported so noUnusedLocals does not flag it.
 */
export type _BundleIdIsRemovable = BundleId extends RemovableId ? true : never

/**
 * Look up a bundle by RemovableId. Returns undefined when the id is broader
 * than BundleId (e.g. 'turnstile' or 'analytics' from the runtime registry,
 * which have no removable bundle). Use this at call sites where the id type is
 * RemovableId; index INTEGRATION_BUNDLES directly only where the id is BundleId.
 */
export function getBundle(id: RemovableId): IntegrationBundle | undefined {
  return (
    INTEGRATION_BUNDLES as Partial<Record<RemovableId, IntegrationBundle>>
  )[id]
}

/**
 * Get all removable integration ids (keys of INTEGRATION_BUNDLES, including
 * dev-only removables like webgl and theatre).
 */
export const getIntegrationNames = (): BundleId[] =>
  Object.keys(INTEGRATION_BUNDLES) as BundleId[]

/** Typed entries of INTEGRATION_BUNDLES (defined keys only). */
export const getIntegrationEntries = (): [BundleId, IntegrationBundle][] =>
  Object.entries(INTEGRATION_BUNDLES) as [BundleId, IntegrationBundle][]
