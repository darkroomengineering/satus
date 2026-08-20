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
  RemoveUseCacheDirectiveOp,
  RemoveVariableStatementOp,
  ReplaceFunctionBodyOp,
  ReplaceJsDocOp,
  RequiredMatchOp,
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
   * Integration-owned files copied wholesale from the payload source when
   * re-adding a bundle, used where statement-level re-injection would be
   * brittle (e.g. the Theatre wiring inside the webgl fluid/flowmap hooks,
   * or the webgl Canvas wiring in the Wrapper). `setup:project` (the only
   * caller) always strips every integration to lean core before re-adding
   * the kept set, so these are overwritten unconditionally by design — by
   * the time this runs there is nothing locally modified left to preserve.
   * A file already matching the payload version is left untouched (a no-op
   * check, not a "don't clobber local changes" guard).
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
      'next-sanity',
    ],
    devDependencies: ['@sanity/vision', 'sanity'],
    // These app/ route folders import from lib/integrations/sanity — they
    // must live and die with the bundle, or a fork that drops Sanity keeps
    // routes whose imports no longer exist and fails to build.
    //
    // app/(site)/(examples)/sanity is NOT here: it's pruned unconditionally
    // by `setup:project` (see `pruneExampleRoutes` in setup-project.ts) so it
    // never ships to a scaffolded project regardless of whether Sanity is
    // kept — it's a wiring tutorial for this repo's own contributors, not
    // real site content. app/(site)/[...slug]/page.tsx (the in-chrome 404
    // handler) is deliberately absent too: it must survive even when Sanity
    // is dropped, so it's stripped in place via codeTransforms below instead
    // of being deleted with the bundle — see this bundle's `overwriteFiles`.
    folders: [
      'lib/integrations/sanity',
      'components/ui/sanity-image',
      'app/(site)/articles',
      'app/studio',
    ],
    files: ['app/api/draft-mode/enable/route.ts'],
    envVars: [
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'NEXT_PUBLIC_SANITY_API_VERSION',
      'NEXT_PUBLIC_SANITY_API_READ_TOKEN',
      'SANITY_API_READ_TOKEN',
      'SANITY_PRIVATE_TOKEN',
      'SANITY_API_WRITE_TOKEN',
      'SANITY_STUDIO_PROJECT_ID',
      'SANITY_REVALIDATE_SECRET',
    ],
    // components/ui has no barrel file — components/ui/sanity-image is
    // imported directly (see lib/integrations/sanity/components/rich-text.tsx),
    // so there is no export line to restore on `satus add sanity`.
    barrelExports: [],
    codeTransforms: [
      {
        file: 'app/(site)/layout.tsx',
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
      // lib/seo/routes.ts is a SHARED SEO surface (feeds app/sitemap.ts and
      // app/llms.txt/route.ts) that stays present in every preset, but its
      // getCmsRoutes() implementation is entirely Sanity-specific. Strip it
      // to a lean stub that always returns [] — callers already degrade
      // gracefully to STATIC_ROUTES / an empty Content section (P-B7: a
      // no-sanity strip left this file's `next-sanity`/sanity imports
      // unstripped, breaking the build once sanity's own deps were removed).
      {
        file: 'lib/seo/routes.ts',
        // Every op here is `required: true`: this file is single-owner
        // (only sanity touches it) and this array runs exactly once against
        // pristine source per setup() run, so a zero-match here can only
        // mean the source shape drifted (e.g. getCmsRoutes renamed) — never
        // a legitimate idempotent re-application. See RequiredMatchOp's
        // docstring in ast-operation-types.ts.
        ops: [
          {
            kind: 'removeImport',
            specifier: '@/integrations/registry',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/live',
            required: true,
          },
          {
            kind: 'removeImport',
            specifier: '@/integrations/sanity/utils/link',
            required: true,
          },
          { kind: 'removeImport', specifier: 'next-sanity', required: true },
          { kind: 'removeImport', specifier: 'zod', required: true },
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
            kind: 'replaceFunctionBody',
            functionName: 'getCmsRoutes',
            replacement: '{\n  return []\n}',
            required: true,
          },
        ],
      },
      // app/api/revalidate/route.ts is a SHARED webhook endpoint — Shopify
      // owns its own guard/dispatch (see the shopify bundle's codeTransforms
      // on this same file); everything else in the handler (the
      // next-sanity/webhook parseBody call, NextResponse.json success path,
      // revalidateTag calls) is Sanity's own logic and must be stripped when
      // Sanity isn't kept, or `next-sanity` being removed from package.json
      // breaks the build (P-B7).
      {
        file: 'app/api/revalidate/route.ts',
        // required: true on all four — this is sanity's half of a two-owner
        // file, applied exactly once per run against the pristine file by
        // setupLean's union pass. stripAbsentIntegrationWiring (which CAN
        // legitimately reapply this same array a second time, against an
        // already-lean file, when sanity is absent but shopify is kept)
        // downgrades `required` to false before calling applyCodeTransforms
        // — see its docstring in bundle-installer.ts.
        ops: [
          {
            kind: 'removeImport',
            specifier: 'next-sanity/webhook',
            required: true,
          },
          { kind: 'removeImport', specifier: 'next/cache', required: true },
          {
            kind: 'removeNamedImport',
            specifier: 'next/server',
            name: 'NextResponse',
            required: true,
          },
          {
            kind: 'removeTryStatement',
            blockContains: 'SANITY_REVALIDATE_SECRET',
            required: true,
          },
        ],
      },
      // app/(site)/[...slug]/page.tsx is the in-chrome 404 handler (it
      // REPLACES app/(site)/[...unmatched]/page.tsx) — it must survive with
      // or without Sanity, so instead of living in `folders` above, it's
      // stripped in place down to a lean `notFound()` stub, single-owner and
      // required (same reasoning as lib/seo/routes.ts above): this array
      // runs exactly once against pristine source per setup() run. The
      // `void params` lines silence noUnusedParameters — there is no
      // remove-function-parameter-entirely op (only removeFunctionParameter,
      // which removes one binding from a destructured pattern and would
      // leave `{}: CmsPageProps`, tripping oxlint's no-empty-pattern), so the
      // stripped body reads the parameter instead of dropping it.
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
            specifier: '@/integrations/sanity/live',
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
          { kind: 'removeImport', specifier: 'next/headers', required: true },
          {
            kind: 'removeVariableStatement',
            name: 'fetchPage',
            required: true,
          },
          {
            kind: 'removeVariableStatement',
            name: 'fetchPageForRequest',
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
    // app/(site)/layout.tsx has complex Sanity wiring (SanityLive, VisualEditing,
    // isConfigured call) that cannot be re-injected statement-by-statement
    // safely.  Restore wholesale from the payload on `satus add sanity`.
    // lib/seo/routes.ts's only owner is Sanity (no other bundle touches it),
    // so a wholesale restore on `satus add sanity` is safe — unlike
    // app/api/revalidate/route.ts below, which Shopify also owns and must be
    // restored surgically via addTransforms instead (overwriteFiles would
    // reintroduce Shopify's wiring even when Shopify isn't kept).
    // app/(site)/[...slug]/page.tsx is likewise single-owner: setupLean's
    // union pass strips it to the lean notFound() stub above, and this
    // restores the full CMS-backed version wholesale when Sanity is kept.
    overwriteFiles: [
      'app/(site)/layout.tsx',
      'lib/seo/routes.ts',
      'app/(site)/[...slug]/page.tsx',
    ],
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
      // app/api/revalidate/route.ts is shared with Shopify (see that
      // bundle's addTransforms on the same file) — restored surgically here
      // rather than via overwriteFiles so keeping Sanity without Shopify
      // never reintroduces Shopify's guard/dispatch import.
      {
        file: 'app/api/revalidate/route.ts',
        ops: [
          {
            kind: 'addImport',
            text: "import { parseBody } from 'next-sanity/webhook'",
          },
          {
            kind: 'addImport',
            text: "import { revalidateTag } from 'next/cache'",
          },
          {
            kind: 'addImport',
            text: "import { NextResponse } from 'next/server'",
          },
          {
            kind: 'addFunctionBodyStatement',
            functionName: 'POST',
            marker: 'SANITY_REVALIDATE_SECRET',
            text: `  try {
    const secret = process.env.SANITY_REVALIDATE_SECRET
    if (!secret) {
      return new Response('Webhook secret not configured', { status: 503 })
    }

    const { body, isValidSignature } = await parseBody<{
      _type: string
      slug?: { current: string }
    }>(request, secret)

    if (!isValidSignature) {
      return new Response('Invalid signature', { status: 401 })
    }

    if (!body?._type) {
      return new Response('Bad Request', { status: 400 })
    }

    revalidateTag(body._type, {})

    if (body.slug?.current) {
      revalidateTag(\`\${body._type}:\${body.slug.current}\`, {})
    }

    return NextResponse.json({
      status: 200,
      revalidated: true,
      now: Date.now(),
    })
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn('Revalidation client error: invalid JSON body', error)
      return new Response('Invalid JSON body', { status: 400 })
    }

    console.error('Revalidation error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }`,
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
    // app/api/cart holds the cart-ensure endpoint, which imports this
    // integration's cart operations — it must live and die with the bundle,
    // or dropping Shopify leaves a route whose imports no longer resolve.
    folders: ['lib/integrations/shopify', 'app/api/cart'],
    files: [],
    // Keep in sync with the SHOPIFY_* keys in lib/env.ts — that schema is the
    // source of truth for what the integration actually reads.
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
          // Remove cdn.shopify.com from images.remotePatterns
          {
            kind: 'removeArrayObjectElement',
            variableName: 'nextConfig',
            propertyPath: 'images.remotePatterns',
            matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
          },
        ],
      },
      // app/api/revalidate/route.ts is a SHARED core route — Sanity also owns
      // part of it (its own codeTransforms entry on this file, above).
      // Stripping Shopify must remove exactly its own import + guard dispatch
      // and nothing else.
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
      // app/api/revalidate/route.ts is shared with Sanity (see that bundle's
      // addTransforms on the same file). Insert right after the rate-limit
      // early-return so the guard runs before Sanity's webhook handling
      // regardless of which bundle's addTransforms runs first.
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
            afterContains: 'Too many requests',
            text: `  const isShopifyWebhook =
    request.headers.has('x-shopify-topic') ||
    request.nextUrl.searchParams.has('secret')

  if (isShopifyWebhook) {
    return shopifyRevalidate(request)
  }`,
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
      // Imported only from lib/webgl, which this bundle deletes, so it has to
      // be listed here or it survives as an orphan in package.json.
      'postprocessing',
    ],
    devDependencies: ['@types/three'],
    // lib/dev/stats renders a WebGL frame-time/GPU meter via `stats-gl`, a
    // package that isn't a direct project dependency — it's only present in
    // node_modules as a transitive dependency of `@react-three/drei` above.
    // Stripping webgl removes that package too, so lib/dev/stats must live
    // and die with the bundle (P-B7: it was orphaned, breaking any no-webgl
    // build on module-not-found).
    folders: ['lib/webgl', 'lib/dev/stats'],
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
          // — pre-existing op, left unmarked (see RequiredMatchOp's
          // docstring: legacy ops keep their existing no-op-on-miss semantics).
          {
            kind: 'removeJsxElement',
            tagName: 'OrchestraToggle',
            attribute: { name: 'id', value: 'webgl' },
          },
          // The stats-gl overlay needs a WebGL canvas — remove its toggle too.
          // required: true — this array runs once against pristine source
          // per setup() run (stripAbsentIntegrationWiring's later reapplication
          // downgrades `required`, see its docstring in bundle-installer.ts).
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
        // Every op here is new (P-B7, the stats-gl orphan fix) and
        // `required: true` for the same reason as lib/seo/routes.ts above.
        ops: [
          // Remove `const Stats = dynamic(…)` (imports the webgl-only stats-gl overlay)
          {
            kind: 'removeVariableStatement',
            name: 'Stats',
            required: true,
          },
          // Remove `{stats && <Stats />}` JSX expression
          { kind: 'removeJsxElement', tagName: 'Stats', required: true },
          // Remove `stats` from `const { stats, grid, … } = useOrchestra()`
          // (unused after the JSX element above is gone — TS6133)
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
    // 'lib/hooks/use-device-detection.ts' is NOT listed here — it's already
    // in `files` above, and with `force: true` the only call mode (L17),
    // an overwriteFiles entry for the same path is a redundant no-op.
    overwriteFiles: ['components/layout/wrapper/index.tsx'],
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
          // Re-add the stats OrchestraToggle next to the other toggles
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
          // Ensure the dynamic() helper import is present
          { kind: 'addImport', text: "import dynamic from 'next/dynamic'" },
          // Re-add `stats` to `const { grid, … } = useOrchestra()`
          {
            kind: 'addDestructuredBinding',
            bindingName: 'stats',
            initializerContains: 'useOrchestra',
          },
          // Re-add `const Stats = dynamic(…)`
          {
            kind: 'addVariableStatement',
            name: 'Stats',
            text: `const Stats = dynamic(() => import('./stats').then(({ Stats }) => Stats), {
  ssr: false,
})`,
          },
          // Re-add `{stats && <Stats />}` inside the OrchestraTools fragment
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
  // SAFETY: RemovableId is deliberately broader than BundleId (see docstring
  // above) — the widened, Partial view is how a RemovableId with no
  // INTEGRATION_BUNDLES entry (turnstile, analytics) legitimately misses.
  return (
    INTEGRATION_BUNDLES as Partial<Record<RemovableId, IntegrationBundle>>
  )[id]
}

/**
 * Get all removable integration ids (keys of INTEGRATION_BUNDLES, including
 * dev-only removables like webgl and theatre).
 */
export const getIntegrationNames = (): BundleId[] =>
  // SAFETY: Object.keys() widens to `string[]` by design; INTEGRATION_BUNDLES
  // is a fully-typed const literal keyed exactly by BundleId.
  Object.keys(INTEGRATION_BUNDLES) as BundleId[]

/** Typed entries of INTEGRATION_BUNDLES (defined keys only). */
export const getIntegrationEntries = (): [BundleId, IntegrationBundle][] =>
  // SAFETY: Object.entries() widens keys to `string` by design;
  // INTEGRATION_BUNDLES is a fully-typed const literal keyed exactly by
  // BundleId, with IntegrationBundle values throughout.
  Object.entries(INTEGRATION_BUNDLES) as [BundleId, IntegrationBundle][]
