/**
 * Which dependencies, folders, and files belong to each integration. Used by
 * `setup:project` to strip unused integrations and by `satus add` to restore
 * them. Key types come from the registry so a key added or renamed in one place
 * only is a compile error.
 */

import type { RemovableId } from '@/integrations/registry'

import type { CodeTransform } from './ast-operation-types'

export type {
  AddArrayObjectElementOp,
  AddArrayStringElementOp,
  AddDestructuredBindingOp,
  AddFunctionBodyStatementOp,
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
  RemoveNamedImportOp,
  RemoveTryStatementOp,
  RemoveVariableStatementOp,
  ReplaceFunctionBodyOp,
  ReplaceJsDocOp,
  RequiredMatchOp,
} from './ast-operation-types'

export interface BarrelExport {
  file: string
  /** Matches export lines to remove, e.g. 'sanity-image' */
  pattern: string
}

export interface IntegrationBundle {
  name: string
  description: string
  dependencies: string[]
  devDependencies: string[]
  folders: string[]
  files: string[]
  envVars: string[]
  /**
   * package.json script names this integration owns: removed on strip (they
   * would point at deleted files), copied back from the payload on re-add
   * (skipped with a warning when the payload never had one).
   */
  scripts?: string[]
  barrelExports: BarrelExport[]
  codeTransforms: CodeTransform[]
  /** Other integrations this one depends on; `satus add` installs them first, transitively. */
  requires?: RemovableId[]
  /** Inverse of `codeTransforms`, built only from the idempotent add* operations. */
  addTransforms?: CodeTransform[]
  /**
   * Files copied wholesale from the payload on re-add, where statement-level
   * re-injection would be brittle (e.g. the Theatre wiring in the webgl hooks,
   * the Canvas wiring in the Wrapper). Overwritten unconditionally by design:
   * `setup:project` (the only caller) strips every integration to lean core
   * first, so nothing local is left to preserve. A file already matching the
   * payload is skipped (a no-op check, not a "don't clobber" guard).
   */
  overwriteFiles?: string[]
}

// Keeps keys literal (so `BundleId` stays exact) while typing every value as
// `IntegrationBundle`: a bare `satisfies` drops optional fields such as
// `requires`, breaking `INTEGRATION_BUNDLES[id].requires`.
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
      '@sanity/client',
      '@sanity/image-url',
      'next-sanity',
    ],
    devDependencies: [
      '@sanity/icons',
      'sanity',
      'sanity-plugin-link-field',
      'styled-components',
    ],
    // These app/ route folders import from lib/integrations/sanity, so they
    // must go with the bundle or a fork that drops Sanity fails to build.
    // Deliberately absent: app/(site)/(examples)/sanity (pruned unconditionally
    // by `pruneExampleRoutes` in setup-project.ts, a contributor tutorial) and
    // app/(site)/[...slug]/page.tsx (the in-chrome 404 handler, which must
    // survive without Sanity, so codeTransforms strips it in place).
    folders: [
      'lib/integrations/sanity',
      'components/ui/sanity-image',
      'app/(site)/articles',
      'app/studio',
    ],
    files: [
      'app/api/draft-mode/enable/route.ts',
      // Drives `buildRoutesFromDocuments`, which is stubbed to return [] when
      // Sanity is dropped (see the lib/seo/routes.ts transform below).
      'lib/seo/routes.test.ts',
      // Reads lib/integrations/sanity/env.ts as text, which goes with the folder above.
      'lib/utils/sanity-env-alias.test.ts',
      'lib/scripts/copy-sanity-mcp.ts',
      // Watches next-sanity moving to @sanity/client v8; nothing to watch without Sanity.
      '.github/workflows/sanity-client-v8.yml',
    ],
    envVars: [
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'NEXT_PUBLIC_SANITY_API_VERSION',
      'SANITY_API_READ_TOKEN',
      'SANITY_STUDIO_PROJECT_ID',
      'SANITY_REVALIDATE_SECRET',
    ],
    // All three scripts point into the stripped bundle (lib/integrations/sanity,
    // lib/scripts/copy-sanity-mcp.ts).
    scripts: ['sanity:extract', 'sanity:typegen', 'sanity:mcp'],
    // components/ui has no barrel; sanity-image is imported directly.
    barrelExports: [],
    codeTransforms: [
      {
        file: 'app/(site)/layout.tsx',
        ops: [
          { kind: 'removeJsxElement', tagName: 'SanityVisualEditing' },
          {
            kind: 'removeImport',
            specifier: '@/lib/integrations/sanity/components/visual-editing',
          },
          { kind: 'removeVariableStatement', name: 'sanityConfigured' },
          { kind: 'removeImport', specifier: '@/lib/integrations/registry' },
        ],
      },
      {
        file: 'next.config.ts',
        ops: [
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
      // lib/seo/routes.ts is SHARED (feeds app/sitemap.ts and
      // app/llms.txt/route.ts) and stays in every preset, but every route it
      // produces comes from the CMS. Strip it to stubs returning no routes;
      // callers degrade to STATIC_ROUTES / an empty Content section.
      //
      // EVERY function that reads a stripped symbol needs its own op, not just
      // the entry point, or a blank or shopify-only scaffold fails typecheck
      // on the removed schema, query, and helpers. The lean-variant test in
      // setup-project.lean-variants.test.ts pins that.
      {
        file: 'lib/seo/routes.ts',
        // Every op is `required: true`: this file is single-owner and this array
        // runs once against pristine source per setup() run, so a zero-match can
        // only mean drift (e.g. getCmsRoutes renamed). See RequiredMatchOp.
        ops: [
          {
            kind: 'removeImport',
            specifier: '@/integrations/registry',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/published',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/utils/link',
            required: true,
          },
          { kind: 'removeImport', specifier: 'next-sanity', required: true },
          { kind: 'removeImport', specifier: 'zod', required: true },
          // MARKDOWN_HANDLER_PATH is read only by RESERVED_PATHS, which is read
          // only by buildRoutesFromDocuments.
          {
            kind: 'removeImport',
            specifier: '@/lib/seo/markdown-path',
            required: true,
          },
          {
            kind: 'removeVariableStatement',
            name: 'routableDocumentSchema',
            required: true,
          },
          {
            kind: 'removeVariableStatement',
            name: 'routableContentQuery',
            required: true,
          },
          {
            kind: 'removeVariableStatement',
            name: 'staticPaths',
            required: true,
          },
          {
            kind: 'removeVariableStatement',
            name: 'RESERVED_PATHS',
            required: true,
          },
          // `void data` keeps the exported signature (and its `unknown` parameter,
          // which the oxlint-disable directive above it still covers) while
          // satisfying noUnusedParameters, like the [...slug] stub's `params`.
          {
            kind: 'replaceJsDoc',
            functionName: 'buildRoutesFromDocuments',
            replacement: `/**
 * Turns a CMS query result into routes. No CMS is wired in this project, so
 * there is never anything to convert.
 */`,
            required: true,
          },
          {
            kind: 'replaceFunctionBody',
            functionName: 'buildRoutesFromDocuments',
            replacement: '{\n  void data\n  return []\n}',
            required: true,
          },
          {
            kind: 'replaceJsDoc',
            functionName: 'fetchCmsRoutesResult',
            replacement: `/**
 * No CMS is wired, so there are no CMS routes and no outage to report —
 * callers degrade to \`STATIC_ROUTES\` only.
 */`,
            required: true,
          },
          {
            kind: 'replaceFunctionBody',
            functionName: 'fetchCmsRoutesResult',
            replacement: '{\n  return { routes: [], degraded: false }\n}',
            required: true,
          },
          {
            kind: 'replaceJsDoc',
            functionName: 'getCmsRoutes',
            replacement: `/** Routes for sitemap.xml, llms.txt and \`/ai\`: none without a CMS. */`,
            required: true,
          },
          {
            kind: 'replaceFunctionBody',
            functionName: 'getCmsRoutes',
            replacement: '{\n  void load\n  return []\n}',
            required: true,
          },
          {
            kind: 'replaceJsDoc',
            functionName: 'getCmsRoutesResult',
            replacement: `/** Accessor for the Markdown handler; never degraded without a CMS. */`,
            required: true,
          },
          {
            kind: 'replaceFunctionBody',
            functionName: 'getCmsRoutesResult',
            replacement: '{\n  return load()\n}',
            required: true,
          },
        ],
      },
      // app/api/revalidate/route.ts is a SHARED webhook endpoint; Shopify owns
      // a guard/dispatch pair there too. Sanity's webhook logic lives in
      // lib/integrations/sanity/revalidate.ts (deleted with `folders`), so only
      // the import, guard variable, and dispatch need stripping, plus the
      // `request` rename once no guard reads it. The terminal 404 fallback
      // belongs to no integration and is never touched, which keeps a
      // sanity-less scaffold compiling (`NextResponse` survives and the
      // handler still ends in a return).
      {
        file: 'app/api/revalidate/route.ts',
        // required: true on all four: sanity's half of a two-owner file, applied
        // once per run to the pristine file by setupLean's union pass.
        // stripAbsentIntegrationWiring can reapply this array to an already-lean
        // file (sanity absent, shopify kept) and downgrades `required` first.
        ops: [
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/revalidate',
            required: true,
          },
          {
            kind: 'removeVariableStatement',
            name: 'isSanityWebhook',
            required: true,
          },
          {
            kind: 'removeIfStatement',
            conditionContains: 'isSanityWebhook',
            required: true,
          },
          // With Shopify's guard gone too, nothing reads `request`: rename it
          // `_request` for `noUnusedParameters` and no-unused-vars. A no-op while
          // Shopify's guard survives.
          {
            kind: 'syncUnusedParameterPrefix',
            functionName: 'POST',
            parameterName: 'request',
            required: true,
          },
        ],
      },
      // app/(site)/[...slug]/page.tsx is the in-chrome 404 handler and must
      // survive without Sanity, so it is stripped in place to a lean
      // `notFound()` stub (single-owner and required, like lib/seo/routes.ts).
      // The `void params` lines silence noUnusedParameters: removeFunctionParameter
      // removes one binding from a destructured pattern and would leave
      // `{}: CmsPageProps`, tripping no-empty-pattern, so the stub reads the
      // parameter instead of dropping it.
      {
        file: 'app/(site)/[...slug]/page.tsx',
        ops: [
          { kind: 'removeImport', specifier: 'next-sanity', required: true },
          {
            kind: 'removeImport',
            specifier: '@/components/layout/wrapper',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/components/ui/link',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/registry',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/components/rich-text',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/fetch',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/known-path',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/queries',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/utils/link',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/utils/metadata',
            required: true,
          },
          {
            kind: 'removeVariableStatement',
            name: 'fetchPage',
            required: true,
          },
          {
            kind: 'replaceFunctionBody',
            functionName: 'CmsPage',
            replacement: '{\n  void params\n  notFound()\n}',
            required: true,
          },
          {
            kind: 'replaceFunctionBody',
            functionName: 'generateMetadata',
            replacement: '{\n  void params\n  return\n}',
            required: true,
          },
        ],
      },
    ],
    // app/(site)/layout.tsx has Sanity wiring (SanityVisualEditing, isConfigured)
    // that can't be re-injected statement by statement. lib/seo/routes.ts and
    // app/(site)/[...slug]/page.tsx are single-owner, so wholesale restore is
    // safe. app/api/revalidate/route.ts is NOT: Shopify also owns it, and
    // overwriteFiles would reintroduce Shopify's wiring when Shopify isn't kept,
    // so it is restored surgically via addTransforms.
    overwriteFiles: [
      'app/(site)/layout.tsx',
      'lib/seo/routes.ts',
      'app/(site)/[...slug]/page.tsx',
    ],
    addTransforms: [
      {
        file: 'next.config.ts',
        ops: [
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
      // app/api/revalidate/route.ts is shared with Shopify: restored surgically
      // here, not via overwriteFiles, so keeping Sanity without Shopify never
      // reintroduces Shopify's guard/dispatch import.
      //
      // The re-added text is the pristine route's own guard/dispatch lines
      // verbatim (a longer copy drifted from the committed file's
      // `{ data, error }` response contract). Anchored before the neutral 404
      // fallback, which every keep-combination has; Shopify's guard anchors
      // ahead of this one, so the pristine order holds whichever bundle
      // re-adds first. `required`: the guard has nowhere sensible to go
      // without that anchor, and a miss stops the run before self-prune.
      {
        file: 'app/api/revalidate/route.ts',
        ops: [
          {
            kind: 'addImport',
            text: "import { revalidate as sanityRevalidate } from '@/integrations/sanity/revalidate'",
          },
          {
            kind: 'addFunctionBodyStatement',
            functionName: 'POST',
            marker: 'isSanityWebhook',
            beforeContains: 'No webhook handler configured',
            required: true,
            text: `  // Sanity signs its webhook body and sends the signature in this header
  // (\`sanity-webhook-signature\`, the name \`next-sanity/webhook\`'s parseBody
  // reads); the handler validates it. It reads the whole body (up to the
  // platform's request body cap) and HMACs it before a wrong signature is
  // rejected, with no wait and no revalidation. Cost: anyone can make this
  // route read and hash a body that size as often as they like.
  const isSanityWebhook = request.headers.has('sanity-webhook-signature')

  if (isSanityWebhook) {
    return sanityRevalidate(request)
  }`,
          },
          // The guard reads `request` again: undo the strip's `_request`.
          {
            kind: 'syncUnusedParameterPrefix',
            functionName: 'POST',
            parameterName: 'request',
            required: true,
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
    // app/api/cart imports this integration's cart operations, so it must go
    // with the bundle.
    folders: ['lib/integrations/shopify', 'app/api/cart'],
    files: [],
    // Keep in sync with the SHOPIFY_* keys in lib/env.ts, the source of truth.
    envVars: [
      'SHOPIFY_STORE_DOMAIN',
      'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
      'SHOPIFY_REVALIDATION_SECRET',
    ],
    barrelExports: [],
    codeTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          {
            kind: 'removeArrayObjectElement',
            variableName: 'nextConfig',
            propertyPath: 'images.remotePatterns',
            matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
          },
        ],
      },
      // Shared with Sanity (its entry on this file is above): strip exactly
      // Shopify's own import and guard dispatch, nothing else.
      {
        file: 'app/api/revalidate/route.ts',
        ops: [
          {
            kind: 'removeImport',
            specifier: '@/integrations/shopify/revalidate',
          },
          {
            kind: 'removeVariableStatement',
            name: 'isShopifyWebhook',
          },
          {
            kind: 'removeIfStatement',
            conditionContains: 'isShopifyWebhook',
          },
          // `request` becomes `_request` once neither guard reads it.
          {
            kind: 'syncUnusedParameterPrefix',
            functionName: 'POST',
            parameterName: 'request',
          },
        ],
      },
    ],
    addTransforms: [
      {
        file: 'next.config.ts',
        ops: [
          {
            kind: 'addArrayObjectElement',
            variableName: 'nextConfig',
            propertyPath: 'images.remotePatterns',
            objectText: "{ protocol: 'https', hostname: 'cdn.shopify.com' }",
            matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
          },
        ],
      },
      // Shared with Sanity. Guard order matters: a request with both a
      // `?secret=` and a `sanity-webhook-signature` header goes to whichever
      // guard comes first. Shopify's guard anchors before Sanity's when present
      // and before the 404 fallback otherwise, while Sanity's always anchors
      // before the 404, so every keep order lands Shopify, Sanity, 404.
      // `required` like Sanity's: an anchor miss is drift.
      {
        file: 'app/api/revalidate/route.ts',
        ops: [
          {
            kind: 'addImport',
            text: "import { revalidate as shopifyRevalidate } from '@/integrations/shopify/revalidate'",
          },
          {
            kind: 'addFunctionBodyStatement',
            functionName: 'POST',
            marker: 'isShopifyWebhook',
            beforeContains: [
              'isSanityWebhook',
              'No webhook handler configured',
            ],
            required: true,
            text: `  // Shopify webhooks identify themselves with an \`x-shopify-topic\` header and
  // always carry a \`secret\` query param. The handler compares the secret in
  // constant time before it reads the body.
  const isShopifyWebhook =
    request.headers.has('x-shopify-topic') ||
    request.nextUrl.searchParams.has('secret')

  if (isShopifyWebhook) {
    return shopifyRevalidate(request)
  }`,
          },
          // The guard reads `request` again: undo the strip's `_request`.
          {
            kind: 'syncUnusedParameterPrefix',
            functionName: 'POST',
            parameterName: 'request',
            required: true,
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
    envVars: [
      'HUBSPOT_ACCESS_TOKEN',
      'NEXT_PUBLIC_HUBSPOT_PORTAL_ID',
      'HUBSPOT_ALLOWED_FORM_IDS',
    ],
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
    dependencies: [
      '@react-three/drei',
      '@react-three/fiber',
      'three',
      // Imported only from lib/webgl, which this bundle deletes; listed here or
      // it survives as an orphan in package.json.
      'postprocessing',
    ],
    devDependencies: ['@types/three'],
    // lib/dev/stats imports `stats-gl`, which is only a transitive dependency
    // of `@react-three/drei` above. Stripping webgl removes it, so lib/dev/stats
    // must go too or a no-webgl build fails on module-not-found.
    folders: ['lib/webgl', 'lib/dev/stats'],
    files: ['lib/hooks/use-device-detection.ts'],
    envVars: [],
    barrelExports: [
      { file: 'lib/hooks/index.ts', pattern: 'use-device-detection' },
    ],
    codeTransforms: [
      {
        file: 'next.config.ts',
        ops: [
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
          { kind: 'removeVariableStatement', name: 'LazyWebGLCanvas' },
          {
            kind: 'removeJsxElement',
            tagName: 'Suspense',
            attribute: { name: 'key', value: 'webgl' },
          },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        ops: [
          // Only the webgl OrchestraToggle (disambiguated by id attr). Left
          // unmarked: legacy ops keep no-op-on-miss semantics.
          {
            kind: 'removeJsxElement',
            tagName: 'OrchestraToggle',
            attribute: { name: 'id', value: 'webgl' },
          },
          // The stats-gl overlay needs a WebGL canvas, so its toggle goes too.
          // required: true; this array runs once against pristine source per
          // setup() run (stripAbsentIntegrationWiring downgrades `required`).
          {
            kind: 'removeJsxElement',
            tagName: 'OrchestraToggle',
            attribute: { name: 'id', value: 'stats' },
            required: true,
          },
        ],
      },
      {
        file: 'lib/dev/index.tsx',
        // `required: true` for the same reason as lib/seo/routes.ts above.
        ops: [
          {
            kind: 'removeVariableStatement',
            name: 'Stats',
            required: true,
          },
          { kind: 'removeJsxElement', tagName: 'Stats', required: true },
          // `stats` is unused once the JSX element above is gone (TS6133).
          {
            kind: 'removeDestructuredBinding',
            bindingName: 'stats',
            initializerContains: 'useOrchestra',
            required: true,
          },
        ],
      },
      {
        file: 'components/layout/wrapper/index.tsx',
        ops: [
          {
            kind: 'removeImport',
            specifier: '@/webgl/components/canvas',
          },
          {
            kind: 'removeInterfaceProperty',
            interfaceName: 'WrapperProps',
            propertyName: 'webgl',
          },
          {
            kind: 'removeFunctionParameter',
            functionName: 'Wrapper',
            parameterName: 'webgl',
          },
          {
            kind: 'removeJsxElement',
            tagName: 'Canvas',
            unwrap: true,
          },
          // Whole-block replacement: ts-morph's description/tag APIs need exact
          // tag shapes.
          {
            kind: 'replaceJsDoc',
            functionName: 'Wrapper',
            replacement: `/**
 * Page root: theme, Lenis smooth scroll, header and footer.
 *
 * \`className\` overrides the base layout (see wrapper.module.css).
 */`,
          },
        ],
      },
    ],
    // The Wrapper's Canvas wiring (import, interface property, destructured
    // param, <Canvas> around <main>, JSDoc) can't be expressed additively, so
    // the file is restored wholesale. 'lib/hooks/use-device-detection.ts' is
    // deliberately not listed: it is already in `files` above, and since
    // `force: true` is the only call mode an overwriteFiles entry is redundant.
    overwriteFiles: ['components/layout/wrapper/index.tsx'],
    addTransforms: [
      {
        file: 'next.config.ts',
        ops: [
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
          { kind: 'addImport', text: "import { lazy, Suspense } from 'react'" },
          {
            kind: 'addVariableStatement',
            name: 'LazyWebGLCanvas',
            text: `const LazyWebGLCanvas = lazy(() =>
  import('@/webgl/components/canvas').then((mod) => ({
    default: mod.Canvas,
  }))
)`,
          },
          {
            kind: 'addJsxChild',
            parentTagName: 'Fragment',
            childText:
              '<Suspense key="webgl" fallback={null}><LazyWebGLCanvas root /></Suspense>',
            childTagName: 'LazyWebGLCanvas',
          },
        ],
      },
      {
        file: 'lib/dev/cmdo.tsx',
        ops: [
          {
            kind: 'addJsxChild',
            parentTagName: 'div',
            childText:
              '<OrchestraToggle id="webgl" defaultValue={true}>🧊</OrchestraToggle>',
            childTagName: 'OrchestraToggle',
            childAttribute: { name: 'id', value: 'webgl' },
          },
          {
            kind: 'addJsxChild',
            parentTagName: 'div',
            childText: '<OrchestraToggle id="stats">📈</OrchestraToggle>',
            childTagName: 'OrchestraToggle',
            childAttribute: { name: 'id', value: 'stats' },
          },
        ],
      },
      {
        file: 'lib/dev/index.tsx',
        ops: [
          { kind: 'addImport', text: "import dynamic from 'next/dynamic'" },
          {
            kind: 'addDestructuredBinding',
            bindingName: 'stats',
            initializerContains: 'useOrchestra',
          },
          {
            kind: 'addVariableStatement',
            name: 'Stats',
            text: `const Stats = dynamic(() => import('./stats').then(({ Stats }) => Stats), {
  ssr: false,
})`,
          },
          {
            kind: 'addJsxChild',
            parentTagName: 'Fragment',
            childText: '{stats && <Stats />}',
            childTagName: 'Stats',
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
          { kind: 'removeVariableStatement', name: 'Studio' },
          { kind: 'removeJsxElement', tagName: 'Studio' },
          // `studio` is unused once the JSX element is gone (TS6133).
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
          {
            kind: 'removeJsxElement',
            tagName: 'OrchestraToggle',
            attribute: { name: 'id', value: 'studio' },
          },
        ],
      },
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
      {
        file: 'lib/webgl/components/canvas/webgl.tsx',
        ops: [
          { kind: 'removeImport', specifier: '@/lib/dev/theatre' },
          { kind: 'removeJsxElement', tagName: 'SheetProvider', unwrap: true },
        ],
      },
      {
        file: 'lib/webgl/components/tunnel/index.tsx',
        ops: [
          { kind: 'removeImport', specifier: '@/lib/dev/theatre' },
          {
            kind: 'removeCallArgument',
            callee: 'useContextBridge',
            argument: 'SheetContext',
          },
        ],
      },
    ],
    requires: ['webgl'],
    // The webgl Theatre wiring (sheet const + useTheatre in the hooks,
    // <SheetProvider> in the canvas, SheetContext bridge in the tunnel) can't be
    // re-injected statement by statement, so these files are restored wholesale,
    // as are lib/dev/index.tsx (the `studio` destructured binding) and
    // lib/dev/cmdo.tsx (the studio OrchestraToggle).
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
          { kind: 'addImport', text: "import dynamic from 'next/dynamic'" },
          {
            kind: 'addVariableStatement',
            name: 'Studio',
            text: `const Studio = dynamic(
  () => import('./theatre/studio').then(({ Studio }) => Studio),
  { ssr: false }
)`,
          },
          // `studio` still comes from the useOrchestra() destructuring, which the
          // removal ops leave in place.
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

/** Keys with a bundle definition: a subset of RemovableId, which also has 'turnstile' and 'analytics'. */
export type BundleId = keyof typeof INTEGRATION_BUNDLES

/**
 * Compile-time guard: becomes `never` (a TS error) when a key not in
 * RemovableId is added to INTEGRATION_BUNDLES. Exported so noUnusedLocals
 * does not flag it.
 */
export type _BundleIdIsRemovable = BundleId extends RemovableId ? true : never

/**
 * Look up a bundle by RemovableId; undefined for ids without a bundle
 * ('turnstile', 'analytics'). Index INTEGRATION_BUNDLES directly only where the
 * id is a BundleId.
 */
export function getBundle(id: RemovableId): IntegrationBundle | undefined {
  // SAFETY: RemovableId is deliberately broader than BundleId (see docstring
  // above) — the widened, Partial view is how a RemovableId with no
  // INTEGRATION_BUNDLES entry (turnstile, analytics) legitimately misses.
  return (
    INTEGRATION_BUNDLES as Partial<Record<RemovableId, IntegrationBundle>>
  )[id]
}

export const getIntegrationNames = (): BundleId[] =>
  // SAFETY: Object.keys() widens to `string[]` by design; INTEGRATION_BUNDLES
  // is a fully-typed const literal keyed exactly by BundleId.
  Object.keys(INTEGRATION_BUNDLES) as BundleId[]

export const getIntegrationEntries = (): [BundleId, IntegrationBundle][] =>
  // SAFETY: Object.entries() widens keys to `string` by design;
  // INTEGRATION_BUNDLES is a fully-typed const literal keyed exactly by
  // BundleId, with IntegrationBundle values throughout.
  Object.entries(INTEGRATION_BUNDLES) as [BundleId, IntegrationBundle][]
