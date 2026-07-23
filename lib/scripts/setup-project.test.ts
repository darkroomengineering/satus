/**
 * Unit tests for the setup-project AST transform engine
 *
 * Run with: bun test lib/scripts/setup-project.test.ts
 *
 * These tests verify:
 * 1. The typed AST operations produce correct output on actual source files
 * 2. Integration bundle configurations are structurally valid
 * 3. Preset configurations reference valid integrations
 * 4. Combined (webgl + theatre) removal leaves files in a valid state
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import { applyOpsToText } from './ast-transforms'
import {
  getIntegrationEntries,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import {
  CACHE_COMPONENTS_DISABLE_TRANSFORM,
  collectSelfPruneTestFiles,
  declaredBundlePaths,
  findMissingPaths,
  isCacheComponentsDisabled,
  PROJECT_PRESETS,
  replaceAnchoredText,
  resolveTransitiveKeepSet,
  SELF_PRUNE_KEEP_TEST_FILES,
  shouldDisableCacheComponents,
  shouldSkipConfirm,
} from './setup-project'
import { getFlagValue } from './utils'

// ---------------------------------------------------------------------------
// Source file fixtures — loaded once, never written to disk
// ---------------------------------------------------------------------------
const sourceFiles: Record<string, string> = {}

beforeAll(async () => {
  const filesToLoad = new Set<string>()

  for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
    for (const transform of bundle.codeTransforms) {
      filesToLoad.add(transform.file)
    }
    for (const transform of bundle.addTransforms ?? []) {
      filesToLoad.add(transform.file)
    }
  }

  for (const file of filesToLoad) {
    try {
      sourceFiles[file] = await Bun.file(file).text()
    } catch {
      sourceFiles[file] = ''
    }
  }
})

// ---------------------------------------------------------------------------
// Structural tests — shape of the bundle config
// ---------------------------------------------------------------------------

describe('Integration Bundle Configuration', () => {
  it('should have valid structure for all bundles', () => {
    for (const [_name, bundle] of getIntegrationEntries()) {
      expect(bundle.name).toBeTruthy()
      expect(bundle.description).toBeTruthy()
      expect(Array.isArray(bundle.dependencies)).toBe(true)
      expect(Array.isArray(bundle.devDependencies)).toBe(true)
      expect(Array.isArray(bundle.folders)).toBe(true)
      expect(Array.isArray(bundle.files)).toBe(true)
      expect(Array.isArray(bundle.envVars)).toBe(true)
      expect(Array.isArray(bundle.barrelExports)).toBe(true)
      expect(Array.isArray(bundle.codeTransforms)).toBe(true)
    }
  })

  it('should have valid barrel export configurations', () => {
    for (const [_name, bundle] of getIntegrationEntries()) {
      for (const barrelExport of bundle.barrelExports) {
        expect(barrelExport.file).toBeTruthy()
        expect(barrelExport.pattern).toBeTruthy()
      }
    }
  })

  it('should have valid code transform configurations (ops shape)', () => {
    for (const [_name, bundle] of getIntegrationEntries()) {
      for (const transform of bundle.codeTransforms) {
        expect(transform.file).toBeTruthy()
        expect(Array.isArray(transform.ops)).toBe(true)

        for (const op of transform.ops) {
          // Every op must have a known kind
          expect([
            'removeImport',
            'removeVariableStatement',
            'removeCallStatement',
            'removeCallArgument',
            'removeJsxElement',
            'removeInterfaceProperty',
            'removeFunctionParameter',
            'replaceJsDoc',
            'removeIfStatement',
            'removeArrayObjectElement',
            'removeArrayStringElement',
            'removeJsxAttribute',
            'removeDestructuredBinding',
          ]).toContain(op.kind)

          // Each op kind must carry its required fields
          if (op.kind === 'removeImport') {
            expect(op.specifier).toBeTruthy()
          } else if (op.kind === 'removeVariableStatement') {
            expect(op.name).toBeTruthy()
          } else if (op.kind === 'removeCallStatement') {
            expect(op.callee).toBeTruthy()
          } else if (op.kind === 'removeCallArgument') {
            expect(op.callee).toBeTruthy()
            expect(op.argument).toBeTruthy()
          } else if (op.kind === 'removeJsxElement') {
            expect(op.tagName).toBeTruthy()
          } else if (op.kind === 'removeInterfaceProperty') {
            expect(op.interfaceName).toBeTruthy()
            expect(op.propertyName).toBeTruthy()
          } else if (op.kind === 'removeFunctionParameter') {
            expect(op.functionName).toBeTruthy()
            expect(op.parameterName).toBeTruthy()
          } else if (op.kind === 'replaceJsDoc') {
            expect(op.functionName).toBeTruthy()
            expect(op.replacement).toBeTruthy()
          } else if (op.kind === 'removeIfStatement') {
            expect(op.conditionContains).toBeTruthy()
          } else if (op.kind === 'removeArrayObjectElement') {
            expect(op.variableName).toBeTruthy()
            expect(op.propertyPath).toBeTruthy()
            expect(op.matchProperty).toBeTruthy()
          } else if (op.kind === 'removeArrayStringElement') {
            expect(op.variableName).toBeTruthy()
            expect(op.propertyPath).toBeTruthy()
            expect(op.value).toBeTruthy()
          } else if (op.kind === 'removeJsxAttribute') {
            expect(op.tagName).toBeTruthy()
            expect(op.attributeName).toBeTruthy()
          } else if (op.kind === 'removeDestructuredBinding') {
            expect(op.bindingName).toBeTruthy()
          }
        }
      }
    }
  })

  it('should have valid additive transform configurations (addTransforms shape)', () => {
    // The re-add step may only use the idempotent ADDITIVE op kinds — a
    // removal op in addTransforms would silently undo an install.
    const additiveKinds = [
      'addImport',
      'addArrayStringElement',
      'addArrayObjectElement',
      'addVariableStatement',
      'addJsxChild',
    ]

    for (const [_name, bundle] of getIntegrationEntries()) {
      for (const transform of bundle.addTransforms ?? []) {
        expect(transform.file).toBeTruthy()
        expect(Array.isArray(transform.ops)).toBe(true)

        for (const op of transform.ops) {
          // Every additive op must have a known ADDITIVE kind
          expect(additiveKinds).toContain(op.kind)

          // Each op kind must carry its required fields
          if (op.kind === 'addImport') {
            expect(op.text).toBeTruthy()
          } else if (op.kind === 'addArrayStringElement') {
            expect(op.variableName).toBeTruthy()
            expect(op.propertyPath).toBeTruthy()
            expect(op.value).toBeTruthy()
          } else if (op.kind === 'addArrayObjectElement') {
            expect(op.variableName).toBeTruthy()
            expect(op.propertyPath).toBeTruthy()
            expect(op.objectText).toBeTruthy()
            expect(op.matchProperty).toBeTruthy()
          } else if (op.kind === 'addVariableStatement') {
            expect(op.name).toBeTruthy()
            expect(op.text).toBeTruthy()
          } else if (op.kind === 'addJsxChild') {
            expect(op.parentTagName).toBeTruthy()
            expect(op.childText).toBeTruthy()
            expect(op.childTagName).toBeTruthy()
          }
        }
      }
    }
  })

  it('should only reference known bundle ids in requires (no self-reference)', () => {
    const known = getIntegrationNames()
    for (const [name, bundle] of getIntegrationEntries()) {
      for (const required of bundle.requires ?? []) {
        expect(known as string[]).toContain(required)
        expect(required).not.toBe(name)
      }
    }
  })

  it('theatre should require webgl', () => {
    expect(INTEGRATION_BUNDLES.theatre?.requires).toEqual(['webgl'])
  })

  it('should declare overwriteFiles as non-empty relative paths', () => {
    for (const [_name, bundle] of getIntegrationEntries()) {
      for (const file of bundle.overwriteFiles ?? []) {
        expect(file).toBeTruthy()
        expect(file.startsWith('/')).toBe(false)
      }
    }
  })

  /**
   * Symmetry invariant: for every bundle, every file named in codeTransforms
   * must be covered by either overwriteFiles OR an addTransforms entry for
   * the same file.  This ensures every removal is reversible.
   *
   * hubspot and mailchimp have empty codeTransforms and trivially pass.
   */
  it('every codeTransform file is covered by overwriteFiles or addTransforms', () => {
    for (const [name, bundle] of getIntegrationEntries()) {
      const overwriteSet = new Set(bundle.overwriteFiles ?? [])
      const addTransformFiles = new Set(
        (bundle.addTransforms ?? []).map((t) => t.file)
      )

      for (const transform of bundle.codeTransforms) {
        const covered =
          overwriteSet.has(transform.file) ||
          addTransformFiles.has(transform.file)
        expect(
          covered,
          `Bundle "${name}": codeTransform on "${transform.file}" has no matching overwriteFiles or addTransforms entry`
        ).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Theatre.js transforms — real engine against actual source
// ---------------------------------------------------------------------------

describe('Theatre.js Code Transforms', () => {
  const theatreBundle = INTEGRATION_BUNDLES.theatre
  if (!theatreBundle) throw new Error('Theatre bundle not found')

  describe('lib/dev/index.tsx transforms', () => {
    const file = 'lib/dev/index.tsx'

    it('should produce valid code after transformation', () => {
      const content = sourceFiles[file]
      if (!content) return

      const transform = theatreBundle.codeTransforms.find(
        (t) => t.file === file
      )
      if (!transform) return

      const result = applyOpsToText(content, transform.ops)

      // Essential structure must remain
      expect(result).toContain("'use client'")
      expect(result).toContain('export function OrchestraTools')
      expect(result).toContain('export function useOrchestra')

      // Theatre-specific code must be gone
      expect(result).not.toContain('./theatre/studio')
      expect(result).not.toContain('<Studio')
      expect(result).not.toContain('const Studio')
    })
  })

  describe('lib/dev/cmdo.tsx transforms', () => {
    const file = 'lib/dev/cmdo.tsx'

    it('should remove only the studio OrchestraToggle', () => {
      const content = sourceFiles[file]
      if (!content) return

      const transform = theatreBundle.codeTransforms.find(
        (t) => t.file === file
      )
      if (!transform) return

      const result = applyOpsToText(content, transform.ops)

      // studio toggle removed
      expect(result).not.toContain('id="studio"')
      // webgl toggle must still be present (not targeted by theatre transforms)
      expect(result).toContain('id="webgl"')
    })
  })

  // Removing theatre while KEEPING webgl must leave the fluid/flowmap hooks
  // compiling — all Theatre wiring stripped, simulation logic intact.
  for (const [file, exportName, simName] of [
    ['lib/webgl/utils/fluid/index.tsx', 'useFluidSim', 'Fluid'],
    ['lib/webgl/utils/flowmaps/index.tsx', 'useFlowmapSim', 'Flowmap'],
  ] as const) {
    describe(`${file} transforms`, () => {
      it('should strip Theatre wiring and keep the simulation hook', () => {
        const content = sourceFiles[file]
        if (!content) return

        const transform = theatreBundle.codeTransforms.find(
          (t) => t.file === file
        )
        if (!transform) return

        const result = applyOpsToText(content, transform.ops)

        // Theatre wiring must be gone
        expect(result).not.toContain('@theatre/core')
        expect(result).not.toContain('@/dev/theatre')
        expect(result).not.toContain('useTheatre')
        expect(result).not.toContain('useCurrentSheet')
        expect(result).not.toContain('sheet')

        // Simulation logic must remain
        expect(result).toContain(`export function ${exportName}`)
        expect(result).toContain(simName)
        expect(result).toContain('useFrame')
      })
    })
  }
})

// ---------------------------------------------------------------------------
// WebGL transforms — real engine against actual source
// ---------------------------------------------------------------------------

describe('WebGL Code Transforms', () => {
  const webglBundle = INTEGRATION_BUNDLES.webgl
  if (!webglBundle) throw new Error('WebGL bundle not found')

  describe('lib/features/index.tsx transforms', () => {
    const file = 'lib/features/index.tsx'

    it('should produce valid code after transformation', () => {
      const content = sourceFiles[file]
      if (!content) return

      const transform = webglBundle.codeTransforms.find((t) => t.file === file)
      if (!transform) return

      const result = applyOpsToText(content, transform.ops)

      // Essential structure must remain
      expect(result).toContain("'use client'")
      expect(result).toContain('export function OptionalFeatures')
      expect(result).toContain('GSAPRuntime')

      // The root WebGL canvas must be gone
      expect(result).not.toContain('LazyWebGLCanvas')
      expect(result).not.toContain('@/webgl/components/canvas')
    })
  })

  describe('components/layout/wrapper/index.tsx transforms', () => {
    const file = 'components/layout/wrapper/index.tsx'

    it('should produce valid code after transformation', () => {
      const content = sourceFiles[file]
      if (!content) return

      const transform = webglBundle.codeTransforms.find((t) => t.file === file)
      if (!transform) return

      const result = applyOpsToText(content, transform.ops)

      // Essential structure must remain
      expect(result).toContain('export function Wrapper')
      expect(result).toContain('interface WrapperProps')
      expect(result).toContain('<Theme')
      expect(result).toContain('<Header')
      expect(result).toContain('<Footer')
      expect(result).toContain('<Lenis')

      // WebGL code must be gone
      expect(result).not.toContain('@/webgl')
      expect(result).not.toContain('<Canvas')
      expect(result).not.toContain('webgl?:')
      expect(result).not.toContain('webgl = false')
    })
  })

  describe('lib/dev/cmdo.tsx transforms', () => {
    const file = 'lib/dev/cmdo.tsx'

    it('should remove only the webgl OrchestraToggle', () => {
      const content = sourceFiles[file]
      if (!content) return

      const transform = webglBundle.codeTransforms.find((t) => t.file === file)
      if (!transform) return

      const result = applyOpsToText(content, transform.ops)

      // webgl toggle removed
      expect(result).not.toContain('id="webgl"')
      // studio toggle must still be present
      expect(result).toContain('id="studio"')
    })
  })
})

// ---------------------------------------------------------------------------
// Preset configuration validity
// ---------------------------------------------------------------------------

describe('Preset Configurations', () => {
  // Derive the preset arrays from the authoritative PROJECT_PRESETS export so
  // that adding/changing a preset here is a compile error, not a silent drift.
  const presets = Object.fromEntries(
    Object.entries(PROJECT_PRESETS).map(([key, preset]) => [
      key,
      [...preset.integrations],
    ])
  ) as Record<keyof typeof PROJECT_PRESETS, string[]>

  const validIntegrations = getIntegrationNames()

  it('should only reference valid integration names', () => {
    for (const [presetName, integrations] of Object.entries(presets)) {
      for (const integration of integrations) {
        expect(
          validIntegrations.includes(integration as never),
          `Preset "${presetName}" references unknown integration "${integration}"`
        ).toBe(true)
      }
    }
  })

  it('editorial should have Sanity and HubSpot', () => {
    expect(presets.editorial).toContain('sanity')
    expect(presets.editorial).toContain('hubspot')
    expect(presets.editorial).not.toContain('webgl')
    expect(presets.editorial).not.toContain('shopify')
  })

  it('studio should have all integrations', () => {
    expect(presets.studio).toContain('sanity')
    expect(presets.studio).toContain('shopify')
    expect(presets.studio).toContain('hubspot')
    expect(presets.studio).toContain('webgl')
    expect(presets.studio).toContain('theatre')
  })

  it('boutique should have Shopify without WebGL', () => {
    expect(presets.boutique).toContain('shopify')
    expect(presets.boutique).toContain('hubspot')
    expect(presets.boutique).not.toContain('webgl')
    expect(presets.boutique).not.toContain('sanity')
  })

  it('gallery should have Shopify with WebGL', () => {
    expect(presets.gallery).toContain('shopify')
    expect(presets.gallery).toContain('webgl')
    expect(presets.gallery).toContain('sanity')
  })

  it('blank should have no integrations', () => {
    expect(presets.blank).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// AST-based next.config.ts transforms (replaces the old regex updateNextConfig)
// ---------------------------------------------------------------------------

describe('next.config.ts AST Transforms', () => {
  // Canonical fixture matching the real next.config.ts shape
  const nextConfigFixture = `
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      '@react-three/drei',
      '@react-three/fiber',
      'gsap',
      'three',
      '@sanity/client',
      '@sanity/image-url',
      '@sanity/asset-utils',
      '@portabletext/react',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
}
`

  // Formatting-variant fixture — indentation and quote style differ from the
  // canonical fixture; the old regex would have silently missed these entries.
  const nextConfigFormattingVariant = `
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@react-three/drei","@react-three/fiber","gsap","three","@sanity/client","@sanity/image-url","@sanity/asset-utils","@portabletext/react"],
  },
  images: {
    remotePatterns: [{"protocol":"https","hostname":"cdn.shopify.com"},{"protocol":"https","hostname":"cdn.sanity.io"}],
  },
}
`

  it('should remove cdn.sanity.io from remotePatterns', () => {
    const result = applyOpsToText(nextConfigFixture, [
      {
        kind: 'removeArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        matchProperty: { name: 'hostname', value: 'cdn.sanity.io' },
      },
    ])
    expect(result).not.toContain('cdn.sanity.io')
    expect(result).toContain('cdn.shopify.com')
  })

  it('should remove cdn.shopify.com from remotePatterns', () => {
    const result = applyOpsToText(nextConfigFixture, [
      {
        kind: 'removeArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
      },
    ])
    expect(result).not.toContain('cdn.shopify.com')
    expect(result).toContain('cdn.sanity.io')
  })

  it('should remove @sanity packages from optimizePackageImports', () => {
    const sanityOps = [
      '@sanity/client',
      '@sanity/image-url',
      '@sanity/asset-utils',
      '@portabletext/react',
    ].map((value) => ({
      kind: 'removeArrayStringElement' as const,
      variableName: 'nextConfig',
      propertyPath: 'experimental.optimizePackageImports',
      value,
    }))

    let result = nextConfigFixture
    for (const op of sanityOps) {
      result = applyOpsToText(result, [op])
    }

    expect(result).not.toContain('@sanity/client')
    expect(result).not.toContain('@sanity/image-url')
    expect(result).not.toContain('@sanity/asset-utils')
    expect(result).not.toContain('@portabletext/react')
    // Non-Sanity entries must survive
    expect(result).toContain('gsap')
    expect(result).toContain('@react-three/drei')
  })

  it('should remove WebGL packages from optimizePackageImports', () => {
    const webglOps = ['@react-three/drei', '@react-three/fiber', 'three'].map(
      (value) => ({
        kind: 'removeArrayStringElement' as const,
        variableName: 'nextConfig',
        propertyPath: 'experimental.optimizePackageImports',
        value,
      })
    )

    let result = nextConfigFixture
    for (const op of webglOps) {
      result = applyOpsToText(result, [op])
    }

    expect(result).not.toContain('@react-three/drei')
    expect(result).not.toContain('@react-three/fiber')
    expect(result).not.toContain('"three"')
    expect(result).not.toContain("'three'")
    // Non-WebGL entries must survive
    expect(result).toContain('gsap')
    expect(result).toContain('@sanity/client')
  })

  it('should handle formatting variants the old regex would have missed', () => {
    // cdn.shopify.com removal in compact object notation
    const result = applyOpsToText(nextConfigFormattingVariant, [
      {
        kind: 'removeArrayObjectElement',
        variableName: 'nextConfig',
        propertyPath: 'images.remotePatterns',
        matchProperty: { name: 'hostname', value: 'cdn.shopify.com' },
      },
    ])
    expect(result).not.toContain('cdn.shopify.com')
    expect(result).toContain('cdn.sanity.io')
  })
})

// ---------------------------------------------------------------------------
// Combined transforms (webgl + theatre removed simultaneously)
// ---------------------------------------------------------------------------

describe('Combined Transforms (Multiple Integrations Removed)', () => {
  it('should work when both WebGL and Theatre are removed', () => {
    const filesToTransform = [
      'lib/dev/index.tsx',
      'lib/dev/cmdo.tsx',
      'lib/features/index.tsx',
      'components/layout/wrapper/index.tsx',
    ]

    const webglBundle = INTEGRATION_BUNDLES.webgl
    const theatreBundle = INTEGRATION_BUNDLES.theatre
    if (!(webglBundle && theatreBundle)) return

    for (const file of filesToTransform) {
      const content = sourceFiles[file]
      if (!content) continue

      const webglTransform = webglBundle.codeTransforms.find(
        (t) => t.file === file
      )
      const theatreTransform = theatreBundle.codeTransforms.find(
        (t) => t.file === file
      )

      let result = content
      if (webglTransform) {
        result = applyOpsToText(result, webglTransform.ops)
      }
      if (theatreTransform) {
        result = applyOpsToText(result, theatreTransform.ops)
      }

      // No broken imports to webgl or theatre
      expect(result).not.toMatch(/from ['"]@\/webgl/)
      expect(result).not.toMatch(/from ['"]\.\/theatre/)

      // Basic structure is intact (no empty exports)
      if (file.endsWith('index.tsx')) {
        expect(result).toMatch(/export (?<keyword>function|const)/)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Additive transforms — remove → add round trips on the real sources
// (the re-add step applied to the lean state produced by `setup:project`)
// ---------------------------------------------------------------------------

describe('Additive Transforms (remove → add round trips)', () => {
  /** Number of times `needle` occurs in `haystack`. */
  const count = (haystack: string, needle: string): number =>
    haystack.split(needle).length - 1

  /**
   * Apply a bundle's removal ops for `file`, then its additive ops, and
   * assert the additive ops are idempotent on the restored result.
   */
  const roundTrip = (
    bundleName: 'sanity' | 'shopify' | 'webgl' | 'theatre',
    file: string
  ): { lean: string; restored: string } | undefined => {
    const bundle = INTEGRATION_BUNDLES[bundleName]
    const content = sourceFiles[file]
    if (!(bundle && content)) return undefined

    const removal = bundle.codeTransforms.find((t) => t.file === file)
    const additive = bundle.addTransforms?.find((t) => t.file === file)
    if (!(removal && additive)) return undefined

    const lean = applyOpsToText(content, removal.ops)
    const restored = applyOpsToText(lean, additive.ops)

    // Issue constraint: adding twice is a no-op.
    expect(applyOpsToText(restored, additive.ops)).toBe(restored)

    return { lean, restored }
  }

  it('webgl: lib/features/index.tsx regains the root canvas wiring', () => {
    const result = roundTrip('webgl', 'lib/features/index.tsx')
    if (!result) return

    expect(result.lean).not.toContain('LazyWebGLCanvas')
    expect(result.restored).toContain('const LazyWebGLCanvas = dynamic(')
    expect(result.restored).toContain('@/webgl/components/canvas')
    expect(result.restored).toContain('<LazyWebGLCanvas root />')
    // Untouched features survive
    expect(result.restored).toContain('GSAPRuntime')
    expect(result.restored).toContain('OrchestraTools')
  })

  it('webgl: lib/dev/cmdo.tsx regains the webgl toggle next to its siblings', () => {
    const result = roundTrip('webgl', 'lib/dev/cmdo.tsx')
    if (!result) return

    expect(result.lean).not.toContain('id="webgl"')
    expect(count(result.restored, 'id="webgl"')).toBe(1)
    // Inserted inside the toggle row, not appended to the outer dialog div:
    // the webgl toggle must come before the row's closing tag, i.e. before
    // the screenshot toggle's container ends.
    expect(result.restored).toContain('id="screenshot"')
    expect(result.restored.indexOf('id="webgl"')).toBeGreaterThan(
      result.restored.indexOf('id="grid"')
    )
  })

  it('webgl: next.config.ts regains the three.js optimizePackageImports entries', () => {
    const result = roundTrip('webgl', 'next.config.ts')
    if (!result) return

    expect(result.lean).not.toContain('@react-three/drei')
    expect(count(result.restored, "'@react-three/drei'")).toBe(1)
    expect(count(result.restored, "'@react-three/fiber'")).toBe(1)
    expect(count(result.restored, "'three'")).toBe(1)
  })

  it('theatre: lib/dev/index.tsx regains the Studio wiring', () => {
    const result = roundTrip('theatre', 'lib/dev/index.tsx')
    if (!result) return

    expect(result.lean).not.toContain('Studio')
    expect(result.restored).toContain('const Studio = dynamic(')
    expect(result.restored).toContain('{studio && <Studio />}')
    // The `studio` binding the JSX expression relies on is still destructured
    expect(result.restored).toContain('useOrchestra()')
  })

  it('theatre: lib/dev/cmdo.tsx regains the studio toggle', () => {
    const result = roundTrip('theatre', 'lib/dev/cmdo.tsx')
    if (!result) return

    expect(result.lean).not.toContain('id="studio"')
    expect(count(result.restored, 'id="studio"')).toBe(1)
    // The webgl toggle is untouched by the theatre round trip
    expect(count(result.restored, 'id="webgl"')).toBe(1)
  })

  it('sanity: next.config.ts regains remotePattern and package imports exactly once', () => {
    const result = roundTrip('sanity', 'next.config.ts')
    if (!result) return

    expect(result.lean).not.toContain('cdn.sanity.io')
    expect(count(result.restored, 'cdn.sanity.io')).toBe(1)
    expect(count(result.restored, "'@sanity/client'")).toBe(1)
    expect(count(result.restored, "'@sanity/image-url'")).toBe(1)
    expect(count(result.restored, "'@sanity/asset-utils'")).toBe(1)
    expect(count(result.restored, "'@portabletext/react'")).toBe(1)
    // The shopify pattern is untouched
    expect(count(result.restored, 'cdn.shopify.com')).toBe(1)
  })

  it('shopify: next.config.ts regains the cdn.shopify.com remotePattern exactly once', () => {
    const result = roundTrip('shopify', 'next.config.ts')
    if (!result) return

    expect(result.lean).not.toContain('cdn.shopify.com')
    expect(count(result.restored, 'cdn.shopify.com')).toBe(1)
    expect(count(result.restored, 'cdn.sanity.io')).toBe(1)
  })

  it('webgl overwrite: the lean wrapper matches the expected lean state', () => {
    // Re-adding webgl restores the Wrapper wholesale; its safety check
    // compares the local file against the payload-with-removal-ops state.
    // Verify the equation holds on the real source: applying the removal ops
    // twice equals applying them once (so a lean wrapper is recognized).
    const bundle = INTEGRATION_BUNDLES.webgl
    const content = sourceFiles['components/layout/wrapper/index.tsx']
    if (!(bundle && content)) return

    const removal = bundle.codeTransforms.find(
      (t) => t.file === 'components/layout/wrapper/index.tsx'
    )
    if (!removal) return

    const lean = applyOpsToText(content, removal.ops)
    expect(applyOpsToText(lean, removal.ops)).toBe(lean)
  })
})

// ---------------------------------------------------------------------------
// resolveTransitiveKeepSet — transitive `requires` resolution (ported from
// the deleted `satus add` CLI's `resolveAddSet`; regression coverage for the
// bug where `--keep theatre` stripped webgl out from under it)
// ---------------------------------------------------------------------------

describe('resolveTransitiveKeepSet', () => {
  it('resolves a standalone integration to itself', () => {
    expect(resolveTransitiveKeepSet(['sanity'])).toEqual({
      order: ['sanity'],
      implied: [],
    })
  })

  it('pulls in required integrations before the requester (theatre → webgl)', () => {
    const { order, implied } = resolveTransitiveKeepSet(['theatre'])

    expect(order).toEqual(['webgl', 'theatre'])
    expect(implied).toEqual(['webgl'])
  })

  it('does not mark explicitly requested dependencies as implied', () => {
    const { order, implied } = resolveTransitiveKeepSet(['theatre', 'webgl'])

    expect(order).toEqual(['webgl', 'theatre'])
    expect(implied).toEqual([])
  })

  it('deduplicates repeated requests', () => {
    const { order } = resolveTransitiveKeepSet(['webgl', 'webgl', 'theatre'])
    expect(order).toEqual(['webgl', 'theatre'])
  })

  it('fails loudly on unknown integration ids', () => {
    expect(() => resolveTransitiveKeepSet(['sanityy'])).toThrow(
      'Unknown integration "sanityy"'
    )
  })

  it('leaves an empty (lean) keep set untouched', () => {
    expect(resolveTransitiveKeepSet([])).toEqual({ order: [], implied: [] })
  })
})

// ---------------------------------------------------------------------------
// H8 — preflight validation before any mutation
// ---------------------------------------------------------------------------

describe('declaredBundlePaths / findMissingPaths (H8 preflight)', () => {
  it('declaredBundlePaths collects folders, files, and overwriteFiles for kept bundles', () => {
    const paths = declaredBundlePaths(['sanity'])

    expect(paths).toContain('lib/integrations/sanity')
    expect(paths).toContain('app/api/draft-mode/enable/route.ts')
    // overwriteFiles
    expect(paths).toContain('app/layout.tsx')
  })

  it('sanity bundle owns every route folder that imports from it', () => {
    // These routes import from lib/integrations/sanity. If they fall out of
    // the bundle's folders, a fork that drops Sanity keeps them and fails to
    // build on module-not-found (the lean-fork build break).
    const paths = declaredBundlePaths(['sanity'])
    expect(paths).toContain('app/(examples)/sanity')
    expect(paths).toContain('app/studio')
  })

  it('declaredBundlePaths is empty for an empty keep set', () => {
    expect(declaredBundlePaths([])).toEqual([])
  })

  it('findMissingPaths reports nothing missing when every real bundle path exists on disk', async () => {
    // Runs against the actual repo tree (this IS the satus repo), so every
    // declared path for every real bundle must be present.
    for (const id of getIntegrationNames()) {
      const missing = await findMissingPaths(declaredBundlePaths([id]))
      expect(missing).toEqual([])
    }
  })

  it('findMissingPaths reports paths an injected exists-check says are absent', async () => {
    const missing = await findMissingPaths(
      ['fake/path/a', 'fake/path/b', 'fake/path/c'],
      async (rel) => rel !== 'fake/path/b' // only "b" is reported missing
    )

    expect(missing).toEqual(['fake/path/b'])
  })

  it('findMissingPaths returns [] when the injected exists-check always resolves', async () => {
    const missing = await findMissingPaths(['a', 'b'], async () => true)
    expect(missing).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// L4 — duplicate CLI flags: first wins, but now with a warning
// ---------------------------------------------------------------------------

describe('getFlagValue (L4 — duplicate flag warning)', () => {
  it('returns the single value when the flag is passed once', () => {
    expect(getFlagValue(['--keep', 'sanity'], '--keep')).toBe('sanity')
  })

  it('keeps first-wins semantics when the flag is passed twice', () => {
    const result = getFlagValue(
      ['--keep', 'sanity', '--keep', 'webgl'],
      '--keep'
    )
    expect(result).toBe('sanity')
  })

  it('warns naming the flag and the winning value on duplicates', () => {
    const warnCalls: unknown[][] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args)
    }

    try {
      getFlagValue(['--preset', 'studio', '--preset', 'blank'], '--preset')
    } finally {
      console.warn = originalWarn
    }

    expect(warnCalls).toHaveLength(1)
    const [message] = warnCalls[0] as [string]
    expect(message).toContain('--preset')
    expect(message).toContain('studio')
    expect(message).toContain('blank')
  })

  it('does not warn when the flag appears once or not at all', () => {
    const warnCalls: unknown[][] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args)
    }

    try {
      getFlagValue(['--keep', 'sanity'], '--keep')
      getFlagValue(['--other', 'x'], '--keep')
    } finally {
      console.warn = originalWarn
    }

    expect(warnCalls).toHaveLength(0)
  })

  it('supports the --flag=value duplicate form too', () => {
    const warnCalls: unknown[][] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args)
    }

    try {
      const result = getFlagValue(['--ref=main', '--ref=v2'], '--ref')
      expect(result).toBe('main')
    } finally {
      console.warn = originalWarn
    }

    expect(warnCalls).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// L10 — selfPrune's test-file list is glob-derived, not hardcoded
// ---------------------------------------------------------------------------

describe('collectSelfPruneTestFiles (L10 — glob-derived, not hardcoded)', () => {
  it('discovers the real setup-machinery test files on disk', async () => {
    const files = await collectSelfPruneTestFiles()

    expect(files).toContain('lib/scripts/setup-project.test.ts')
    expect(files).toContain('lib/scripts/ast-transforms.test.ts')
    expect(files).toContain('lib/scripts/payload-source.test.ts')
  })

  it('excludes every entry in the KEEP allowlist', async () => {
    const files = await collectSelfPruneTestFiles()

    for (const kept of SELF_PRUNE_KEEP_TEST_FILES) {
      expect(files).not.toContain(kept)
    }
    // Concrete regression check: templates.test.ts ships with every
    // scaffolded project (it tests prepare-handoff's templates) and must
    // survive self-prune.
    expect(files).not.toContain('lib/scripts/templates/templates.test.ts')
  })
})

// ---------------------------------------------------------------------------
// H6 — `--yes` confirm-prompt gating
// ---------------------------------------------------------------------------

describe('shouldSkipConfirm (H6 — --yes gating)', () => {
  it('always skips when --yes is passed', () => {
    expect(shouldSkipConfirm({ yes: true, hasFlags: false, isTTY: true })).toBe(
      true
    )
    expect(shouldSkipConfirm({ yes: true, hasFlags: true, isTTY: true })).toBe(
      true
    )
    expect(shouldSkipConfirm({ yes: true, hasFlags: true, isTTY: false })).toBe(
      true
    )
  })

  it('never skips for a fully interactive run (no --preset/--keep)', () => {
    expect(
      shouldSkipConfirm({ yes: false, hasFlags: false, isTTY: true })
    ).toBe(false)
    expect(
      shouldSkipConfirm({ yes: false, hasFlags: false, isTTY: false })
    ).toBe(false)
  })

  it('shows the prompt for --preset/--keep at an interactive terminal without --yes', () => {
    expect(shouldSkipConfirm({ yes: false, hasFlags: true, isTTY: true })).toBe(
      false
    )
  })

  it('skips for --preset/--keep off a TTY without --yes (create-darkroom contract)', () => {
    expect(
      shouldSkipConfirm({ yes: false, hasFlags: true, isTTY: false })
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Cache Components opt-out (no CMS/storefront kept)
//
// `setupCacheComponentsOptOut` itself does real disk I/O keyed off
// `process.cwd()` (via `resolvePath`), and this repo's test harness has no
// fixture-project-tree mechanism to redirect that safely — every other test
// in this file exercises pure/exported helpers rather than spinning up a
// fake project directory. These tests cover the same four keep-set cases
// (a–d from the plan) at the level this harness actually supports: the pure
// decision function, the exact production config transform (applied
// in-memory via `applyOpsToText`, exactly as `applyCodeTransforms` would),
// and the pure doc-anchor replacement against the REAL current doc sentences
// (a regression check that the anchors haven't silently gone stale).
// ---------------------------------------------------------------------------

describe('shouldDisableCacheComponents', () => {
  it('(a) is true for a lean keep set (no integrations)', () => {
    expect(shouldDisableCacheComponents([])).toBe(true)
  })

  it('(b) is false when shopify is kept', () => {
    expect(shouldDisableCacheComponents(['shopify'])).toBe(false)
  })

  it('(c) is false when sanity is kept', () => {
    expect(shouldDisableCacheComponents(['sanity'])).toBe(false)
  })

  it('(d) is true when only hubspot (no CMS/storefront) is kept', () => {
    expect(shouldDisableCacheComponents(['hubspot'])).toBe(true)
  })

  it('is false when sanity is kept alongside other non-CMS integrations', () => {
    expect(
      shouldDisableCacheComponents(['sanity', 'hubspot', 'mailchimp'])
    ).toBe(false)
  })

  it('is true when every kept integration is neither sanity nor shopify', () => {
    expect(
      shouldDisableCacheComponents(['hubspot', 'mailchimp', 'turnstile'])
    ).toBe(true)
  })
})

describe('CACHE_COMPONENTS_DISABLE_TRANSFORM (production ops applied to a next.config-shaped fixture)', () => {
  const nextConfigFixture = `const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    taint: true,
    cachedNavigations: true,
    prefetchInlining: true,
  },
}

export default nextConfig
`

  it('flips cacheComponents and experimental.cachedNavigations to false, leaving other flags untouched', () => {
    const result = applyOpsToText(
      nextConfigFixture,
      CACHE_COMPONENTS_DISABLE_TRANSFORM.ops
    )

    expect(result).toContain('cacheComponents: false')
    expect(result).not.toContain('cacheComponents: true')
    expect(result).toContain('cachedNavigations: false')
    // Probed separately as not requiring cacheComponents — left untouched.
    expect(result).toContain('prefetchInlining: true')
    expect(result).toContain('taint: true')
  })

  it('is idempotent — applying twice yields the same result', () => {
    const once = applyOpsToText(
      nextConfigFixture,
      CACHE_COMPONENTS_DISABLE_TRANSFORM.ops
    )
    const twice = applyOpsToText(once, CACHE_COMPONENTS_DISABLE_TRANSFORM.ops)
    expect(twice).toBe(once)
  })

  it('targets next.config.ts', () => {
    expect(CACHE_COMPONENTS_DISABLE_TRANSFORM.file).toBe('next.config.ts')
  })
})

describe('isCacheComponentsDisabled (docs-vs-config consistency guard)', () => {
  it('is true after the production transform runs', () => {
    const nextConfigFixture = `const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: { cachedNavigations: true },
}
`
    const flipped = applyOpsToText(
      nextConfigFixture,
      CACHE_COMPONENTS_DISABLE_TRANSFORM.ops
    )
    expect(isCacheComponentsDisabled(flipped)).toBe(true)
  })

  it('is true for hand-edited spacing variants', () => {
    expect(isCacheComponentsDisabled('cacheComponents:false,')).toBe(true)
    expect(isCacheComponentsDisabled('cacheComponents : false,')).toBe(true)
  })

  it('is false when the flip silently no-opped (unrecognized config shape)', () => {
    // A fork that renamed `nextConfig` — the op finds no variable and
    // returns the text unchanged; docs must then NOT claim it is disabled.
    const renamed = `const config: NextConfig = {
  cacheComponents: true,
}
`
    const result = applyOpsToText(
      renamed,
      CACHE_COMPONENTS_DISABLE_TRANSFORM.ops
    )
    expect(result).toBe(renamed)
    expect(isCacheComponentsDisabled(result)).toBe(false)
  })

  it('is false for an empty/missing config', () => {
    expect(isCacheComponentsDisabled('')).toBe(false)
  })
})

describe('replaceAnchoredText (doc patching)', () => {
  it('replaces the exact anchor substring and reports changed:true', () => {
    const content = 'before\nCache Components are enabled globally.\nafter\n'
    const { text, changed } = replaceAnchoredText(
      content,
      'Cache Components are enabled globally.',
      'Cache Components is disabled in this project.'
    )
    expect(changed).toBe(true)
    expect(text).toBe(
      'before\nCache Components is disabled in this project.\nafter\n'
    )
  })

  it('is an exact no-op (changed:false) when the anchor is absent', () => {
    const content = 'no matching sentence here\n'
    const result = replaceAnchoredText(content, 'not present', 'replacement')
    expect(result.changed).toBe(false)
    expect(result.text).toBe(content)
  })

  it("finds the current AGENTS.md sentence claiming Cache Components is enabled (anchor hasn't gone stale)", async () => {
    const agentsMd = await Bun.file('AGENTS.md').text()
    const anchor =
      'Cache Components are enabled globally (`cacheComponents: true` in `next.config.ts`).'
    const { text, changed } = replaceAnchoredText(
      agentsMd,
      anchor,
      'Cache Components is disabled in this project (no CMS/storefront integration kept at setup). Re-enable `cacheComponents` in next.config.ts when adding one.'
    )
    expect(changed).toBe(true)
    expect(text).not.toContain(anchor)
    expect(text).toContain('Cache Components is disabled in this project')
  })

  it("finds the current ARCHITECTURE.md sentence claiming Cache Components is enabled (anchor hasn't gone stale)", async () => {
    const architectureMd = await Bun.file('ARCHITECTURE.md').text()
    const anchor = 'Server Components use advanced caching. Key rules:'
    const { text, changed } = replaceAnchoredText(
      architectureMd,
      anchor,
      'Cache Components is disabled in this project (no CMS/storefront integration kept at setup). Re-enable `cacheComponents` in next.config.ts when adding one.'
    )
    expect(changed).toBe(true)
    expect(text).not.toContain(anchor)
    expect(text).toContain('Cache Components is disabled in this project')
  })
})
