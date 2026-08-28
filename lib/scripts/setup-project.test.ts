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
import { chmod, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { applyOpsToText, RequiredOpMatchError } from './ast-transforms'
import { guardedPrompt } from './generate-shared'
import {
  getIntegrationEntries,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import type { PayloadSource } from './payload-source'
import {
  CACHE_COMPONENTS_DISABLE_TRANSFORM,
  CACHE_COMPONENTS_LLMS_TXT_TRANSFORM,
  codeTransformTargetPaths,
  collectSelfPruneTestFiles,
  declaredBundlePaths,
  findMissingPaths,
  findUnknownFlags,
  isCacheComponentsDisabled,
  KNOWN_SETUP_FLAGS,
  PROJECT_PRESETS,
  replaceAnchoredText,
  resolveTransitiveKeepSet,
  SELF_PRUNE_KEEP_TEST_FILES,
  SETUP_PROJECT_PRUNED_STUB,
  setupAddIntegrations,
  shouldDisableCacheComponents,
  shouldSkipConfirm,
} from './setup-project'
import {
  getFlagValue,
  PENDING_FORMAT_MARKER,
  PENDING_FORMAT_MAX_ATTEMPTS,
  pathExists,
  projectRoot,
} from './utils'

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
            'removeNamedImport',
            'removeVariableStatement',
            'removeCallStatement',
            'removeCallArgument',
            'removeJsxElement',
            'removeInterfaceProperty',
            'removeFunctionParameter',
            'replaceJsDoc',
            'removeIfStatement',
            'removeTryStatement',
            'replaceFunctionBody',
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
          } else if (op.kind === 'removeNamedImport') {
            expect(op.specifier).toBeTruthy()
            expect(op.name).toBeTruthy()
          } else if (op.kind === 'removeTryStatement') {
            expect(op.blockContains).toBeTruthy()
          } else if (op.kind === 'replaceFunctionBody') {
            expect(op.functionName).toBeTruthy()
            expect(op.replacement).toBeTruthy()
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
      'addDestructuredBinding',
      'addFunctionBodyStatement',
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
          } else if (op.kind === 'addDestructuredBinding') {
            expect(op.bindingName).toBeTruthy()
            expect(op.initializerContains).toBeTruthy()
          } else if (op.kind === 'addFunctionBodyStatement') {
            expect(op.functionName).toBeTruthy()
            expect(op.text).toBeTruthy()
            expect(op.marker).toBeTruthy()
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

  // L17: with `force: true` the only call mode `installBundle` ever uses,
  // an overwriteFiles entry for a path ALSO in the same bundle's `files` is
  // a redundant no-op — copyBundleFiles already force-overwrites it.
  it('overwriteFiles never duplicates a path already in files (L17)', () => {
    for (const [name, bundle] of getIntegrationEntries()) {
      const fileSet = new Set(bundle.files)
      for (const file of bundle.overwriteFiles ?? []) {
        expect(
          fileSet.has(file),
          `Bundle "${name}": "${file}" is in both files and overwriteFiles — redundant with force: true`
        ).toBe(false)
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
// RequiredOpMatchError — the required-match contract (cross-model review
// HIGH finding on the P-B7 ops): a `required: true` op that matches nothing
// must fail the whole run loudly, not silently leave a broken tree.
// ---------------------------------------------------------------------------

describe('RequiredOpMatchError (required-match contract)', () => {
  it('applyOpsToText throws when a required op misses while a sibling op applies', () => {
    // Partial application is the hazard the contract guards: the `bar`
    // removal succeeds (file changed) while the required `doesNotExist`
    // removal finds nothing — drifted source, not an already-stripped file.
    const src = 'const bar = 1\nexport function foo() {\n  return bar\n}\n'
    expect(() =>
      applyOpsToText(src, [
        { kind: 'removeVariableStatement', name: 'bar', required: true },
        {
          kind: 'removeVariableStatement',
          name: 'doesNotExist',
          required: true,
        },
      ])
    ).toThrow(RequiredOpMatchError)
  })

  it('the thrown error names the missed op and hints at drift', () => {
    const src =
      "import { x } from '@/exists'\nconst bar = 1\nexport function foo() {\n  return bar + x\n}\n"
    expect(() =>
      applyOpsToText(src, [
        { kind: 'removeVariableStatement', name: 'bar', required: true },
        {
          kind: 'removeImport',
          specifier: '@/does/not/exist',
          required: true,
        },
      ])
    ).toThrow(/drifted.*removeImport '@\/does\/not\/exist'/is)
  })

  it('a transform where EVERY required op misses no-ops (re-run recovery)', () => {
    // The inverse of the partial case: a byte-identical result means a
    // previous run already applied this transform (writes are per-file
    // atomic), so repeating an aborted setup:project run must succeed here
    // instead of throwing on work the first run finished.
    const src = 'export function foo() {\n  return 1\n}\n'
    const result = applyOpsToText(src, [
      {
        kind: 'removeVariableStatement',
        name: 'doesNotExist',
        required: true,
      },
      {
        kind: 'removeImport',
        specifier: '@/does/not/exist',
        required: true,
      },
    ])
    expect(result).toBe(src)
  })

  // A single-op required transform can never trip the partial-application
  // signal, so the anchor probe is its only drift detection: the miss is
  // tolerated only while the op's container construct still exists.
  it('single required op: container present without the construct no-ops (already applied)', async () => {
    const content = await Bun.file(
      CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.file
    ).text()
    // First application strips the directive; buildBody itself survives.
    const stripped = applyOpsToText(
      content,
      CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.ops
    )
    expect(stripped).not.toBe(content)
    expect(
      applyOpsToText(stripped, CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.ops)
    ).toBe(stripped)
  })

  it('single required op: a missing container throws even on a byte-identical file', async () => {
    const content = await Bun.file(
      CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.file
    ).text()
    // The drift Codex's cross-model review called out: buildBody renamed →
    // the directive op misses AND nothing else changes the file, but the
    // op's premise is gone — Cache Components would be disabled while a
    // 'use cache' directive stays behind.
    const drifted = content.replaceAll('buildBody', 'composeBody')
    expect(() =>
      applyOpsToText(drifted, CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.ops)
    ).toThrow(RequiredOpMatchError)
  })

  it('single required op: a directive that MOVED to another function throws', async () => {
    // Cross-model review round 2: the function-exists probe alone reads a
    // relocated 'use cache' as already-applied — buildBody stands
    // directive-less — but disabling Cache Components requires every
    // directive gone, so a survivor anywhere in the file is drift.
    const content = await Bun.file(
      CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.file
    ).text()
    const stripped = applyOpsToText(
      content,
      CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.ops
    )
    const moved = `${stripped}\n\nasync function elsewhere() {\n  'use cache'\n  return null\n}\n`
    expect(() =>
      applyOpsToText(moved, CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.ops)
    ).toThrow(RequiredOpMatchError)
  })

  it('re-applying a real bundle transform to an already-stripped file no-ops', () => {
    // The exact H5 scenario: a required op late in setupLean's union fails
    // after lib/seo/routes.ts was already stripped and written; the retry
    // reapplies the same ops to the stripped file and must not throw.
    const content = sourceFiles['lib/seo/routes.ts']
    const bundle = INTEGRATION_BUNDLES.sanity
    const transform = bundle?.codeTransforms.find(
      (t) => t.file === 'lib/seo/routes.ts'
    )
    if (!(content && transform)) return

    const lean = applyOpsToText(content, transform.ops)
    expect(applyOpsToText(lean, transform.ops)).toBe(lean)
  })

  it('a required op that DOES match does not throw', () => {
    const src = 'const foo = 1\nexport function bar() {\n  return foo\n}\n'
    const result = applyOpsToText(src, [
      { kind: 'removeVariableStatement', name: 'foo', required: true },
    ])
    expect(result).not.toContain('const foo')
  })

  it('a non-required op still silently no-ops on a miss (legacy semantics preserved)', () => {
    const src = 'export function foo() {\n  return 1\n}\n'
    const result = applyOpsToText(src, [
      { kind: 'removeVariableStatement', name: 'doesNotExist' },
    ])
    expect(result).toBe(src)
  })

  // The exact scenario the finding describes: "a future rename moves
  // getCmsRoutes" — proven against the REAL sanity bundle ops and the REAL
  // (mutated) source, not a synthetic fixture.
  it('drifted fixture: renaming getCmsRoutes makes the sanity lib/seo/routes.ts strip fail loudly', () => {
    const content = sourceFiles['lib/seo/routes.ts']
    const bundle = INTEGRATION_BUNDLES.sanity
    const transform = bundle?.codeTransforms.find(
      (t) => t.file === 'lib/seo/routes.ts'
    )
    if (!(content && transform)) return

    const drifted = content.replaceAll('getCmsRoutes', 'getCMSRoutes')

    expect(() => applyOpsToText(drifted, transform.ops)).toThrow(
      RequiredOpMatchError
    )
    // Sanity-check the test itself: the un-drifted file must still strip cleanly.
    expect(() => applyOpsToText(content, transform.ops)).not.toThrow()
  })

  // The other scenario the finding names: "the revalidate try-block shape
  // drifts" — proven against the real shared-file ops.
  it('drifted fixture: a restructured revalidate try-block makes the sanity strip fail loudly', () => {
    const content = sourceFiles['app/api/revalidate/route.ts']
    const bundle = INTEGRATION_BUNDLES.sanity
    const transform = bundle?.codeTransforms.find(
      (t) => t.file === 'app/api/revalidate/route.ts'
    )
    if (!(content && transform)) return

    const drifted = content.replace(
      'SANITY_REVALIDATE_SECRET',
      'SANITY_SECRET_V2'
    )

    expect(() => applyOpsToText(drifted, transform.ops)).toThrow(
      RequiredOpMatchError
    )
    expect(() => applyOpsToText(content, transform.ops)).not.toThrow()
  })

  // Mirrors bundle-installer.ts's stripAbsentIntegrationWiring downgrade:
  // reapplying the SAME required ops (with `required` forced to false) to
  // source that already had them applied once must never throw — that's
  // the expected idempotent no-op, not drift.
  it('downgrading required to false (stripAbsentIntegrationWiring-style) tolerates an already-lean file', () => {
    const content = sourceFiles['lib/seo/routes.ts']
    const bundle = INTEGRATION_BUNDLES.sanity
    const transform = bundle?.codeTransforms.find(
      (t) => t.file === 'lib/seo/routes.ts'
    )
    if (!(content && transform)) return

    const lean = applyOpsToText(content, transform.ops)
    const downgraded = transform.ops.map((op) => ({ ...op, required: false }))
    expect(() => applyOpsToText(lean, downgraded)).not.toThrow()
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
    expect(paths).toContain('app/(site)/layout.tsx')
  })

  it('sanity bundle owns every route folder that imports from it', () => {
    // These routes import from lib/integrations/sanity. If they fall out of
    // the bundle's folders/overwriteFiles, a fork that drops Sanity keeps
    // them and fails to build on module-not-found (the lean-fork build
    // break). app/(site)/(examples)/sanity is NOT here — it's pruned
    // unconditionally by setup:project (see the pruneExampleRoutes tests),
    // regardless of which integrations are kept.
    const paths = declaredBundlePaths(['sanity'])
    expect(paths).toContain('app/(site)/articles')
    expect(paths).toContain('app/studio')
    // The in-chrome 404 handler is stripped in place (codeTransforms), not
    // deleted with the bundle — it's declared via overwriteFiles instead.
    expect(paths).toContain('app/(site)/[...slug]/page.tsx')
  })

  it('shopify bundle owns every route folder that imports from it', () => {
    // app/api/cart/ensure imports lib/integrations/shopify's cart operations.
    // If it falls out of the bundle's folders, a fork that drops Shopify
    // keeps the route and fails to build on module-not-found — the same
    // lean-fork break the sanity assertions above guard against.
    const paths = declaredBundlePaths(['shopify'])
    expect(paths).toContain('lib/integrations/shopify')
    expect(paths).toContain('app/api/cart')
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
// issue #389 — preflight also covers codeTransform target files, not just
// kept-bundle folders/files/overwriteFiles. codeTransforms run against the
// tree unconditionally (setupLean's strip pass touches every bundle,
// regardless of what's kept), so a shared file that's absent must fail the
// preflight even when no bundle declares it in folders/files.
// ---------------------------------------------------------------------------

describe('codeTransformTargetPaths (issue #389 preflight)', () => {
  it('collects the target file of every bundle codeTransform plus both Cache Components transforms', () => {
    // Empty keep-set: no CMS and no storefront, so the Cache Components
    // opt-out pass will run and its targets are required.
    const paths = codeTransformTargetPaths([])

    // A cross-bundle shared file: not in any bundle's folders/files, so
    // declaredBundlePaths alone would never notice it going missing.
    expect(paths).toContain('app/api/revalidate/route.ts')
    expect(paths).toContain(CACHE_COMPONENTS_DISABLE_TRANSFORM.file)
    expect(paths).toContain(CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.file)
  })

  it('is deduplicated', () => {
    const paths = codeTransformTargetPaths([])
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('findMissingPaths reports nothing missing against the real repo tree', async () => {
    // Runs against the actual repo tree (this IS the satus repo), so every
    // codeTransform's target file must be present.
    const missing = await findMissingPaths(codeTransformTargetPaths([]))
    expect(missing).toEqual([])
  })

  it('omits the Cache Components-only target when a CMS is kept, matching the run', () => {
    // setupCacheComponentsOptOut returns early when a CMS/storefront
    // survives, so requiring its targets would make the preflight stricter
    // than the execution path. Only app/llms.txt/route.ts is unique to that
    // pass — next.config.ts is a bundle codeTransform target too, so it is
    // required either way.
    const paths = codeTransformTargetPaths(['sanity'])
    expect(paths).not.toContain(CACHE_COMPONENTS_LLMS_TXT_TRANSFORM.file)
    expect(paths).toContain(CACHE_COMPONENTS_DISABLE_TRANSFORM.file)
  })

  it('a deleted transform-target file fails the preflight before any mutation', async () => {
    const paths = codeTransformTargetPaths([])
    const deletedFile = paths[0]
    if (!deletedFile)
      throw new Error('expected at least one codeTransform path')

    const missing = await findMissingPaths(
      paths,
      async (rel) => rel !== deletedFile
    )

    expect(missing).toEqual([deletedFile])
  })

  // L16: addTransforms only ran for KEPT bundles (via installBundle, step 8),
  // but the preflight never walked addTransforms at all — it only required
  // codeTransforms targets. Every addTransforms target happens to coincide
  // with some bundle's codeTransforms target today (verified below), so the
  // gap was silent; this pins the contract so a FUTURE addTransforms-only
  // target (the exact drift L16 warns about) fails loudly here instead of
  // wedging setupAddIntegrations mid-run.
  it('includes every kept bundle addTransforms target file (L16)', () => {
    for (const [id, bundle] of getIntegrationEntries()) {
      const addTransformFiles = (bundle.addTransforms ?? []).map((t) => t.file)
      if (addTransformFiles.length === 0) continue

      const paths = codeTransformTargetPaths([id])
      for (const file of addTransformFiles) {
        expect(paths).toContain(file)
      }
    }
  })

  it('does not require a bundle addTransforms target when that bundle is not kept and no other bundle needs it', () => {
    // Cross-check against the real bundle set: today every addTransforms
    // target coincides with SOME bundle's unconditional codeTransforms
    // target, so codeTransformTargetPaths([]) already contains it via that
    // path — this documents why the empty-keep-set case looks unchanged,
    // rather than leaving that coincidence unexplained.
    const codeTransformFiles = new Set<string>()
    for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
      for (const transform of bundle.codeTransforms) {
        codeTransformFiles.add(transform.file)
      }
    }
    for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
      for (const transform of bundle.addTransforms ?? []) {
        expect(codeTransformFiles.has(transform.file)).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// M4 — a typo'd CLI flag used to be silently absorbed and fall through to
// the interactive prompt, which hangs forever on a non-TTY-but-open stdin
// (CI). findUnknownFlags rejects it loudly instead.
// ---------------------------------------------------------------------------

describe('findUnknownFlags (M4 — unknown-flag rejection)', () => {
  it('returns [] for every documented flag, long and short form', () => {
    expect(findUnknownFlags(['--preset', 'editorial'])).toEqual([])
    expect(findUnknownFlags(['--keep', 'sanity,shopify'])).toEqual([])
    expect(findUnknownFlags(['--yes'])).toEqual([])
    expect(findUnknownFlags(['--clean-homepage'])).toEqual([])
    expect(findUnknownFlags(['--skip-install'])).toEqual([])
    expect(findUnknownFlags(['--dry-run'])).toEqual([])
    expect(findUnknownFlags(['--help'])).toEqual([])
    expect(findUnknownFlags(['--preset=editorial'])).toEqual([])
  })

  it('flags a typo of a known long flag', () => {
    expect(findUnknownFlags(['--presett', 'editorial'])).toEqual(['--presett'])
  })

  it('never flags a bare value, even one that looks flag-like as an id', () => {
    // --keep's value is a comma-separated id list, never itself `--`-prefixed
    // in practice, but the value token itself must never be checked — only
    // `--`-prefixed tokens are.
    expect(findUnknownFlags(['--keep', 'sanity'])).toEqual([])
  })

  it('collects every unknown flag, not just the first', () => {
    expect(findUnknownFlags(['--bogus', '--yes', '--nope'])).toEqual([
      '--bogus',
      '--nope',
    ])
  })

  it('KNOWN_SETUP_FLAGS matches what printUsage documents', () => {
    expect(KNOWN_SETUP_FLAGS).toContain('--preset')
    expect(KNOWN_SETUP_FLAGS).toContain('--keep')
    expect(KNOWN_SETUP_FLAGS).toContain('--yes')
    expect(KNOWN_SETUP_FLAGS).toContain('--clean-homepage')
    expect(KNOWN_SETUP_FLAGS).toContain('--skip-install')
    expect(KNOWN_SETUP_FLAGS).toContain('--dry-run')
    expect(KNOWN_SETUP_FLAGS).toContain('--help')
  })

  it('an unknown flag exits 1 before reaching the interactive prompt (subprocess)', () => {
    const proc = Bun.spawnSync(
      ['bun', 'lib/scripts/setup-project.ts', '--totally-bogus-flag'],
      {
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'ignore',
      }
    )
    expect(proc.exitCode).toBe(1)
    const output = proc.stdout.toString() + proc.stderr.toString()
    expect(output).toContain('--totally-bogus-flag')
  }, 20000)
})

// ---------------------------------------------------------------------------
// M1 — a raw throw from installBundle's copyBundleFiles/readPayloadFile/
// listPayloadFiles used to escape uncaught, aborting the whole re-add batch
// (every bundle after the failing one never even attempted a re-add) after
// step 6 had already stripped every bundle's files from the live tree.
// setupAddIntegrations now catches per-bundle, collects the failure, and
// keeps processing the remaining bundles.
// ---------------------------------------------------------------------------

describe('M1: setupAddIntegrations collects per-bundle installBundle failures', () => {
  it('a bundle whose payload is missing a declared folder fails without aborting the batch', async () => {
    // Minimal synthetic payload source — NOT built via setupSnapshot, so it
    // can deliberately omit a declared path. webgl's payload is incomplete
    // ('lib/webgl' is never created), which makes copyBundleFiles's
    // listPayloadFiles call throw a raw Error — the exact M1 escape hatch.
    // hubspot's payload is complete, so it should install cleanly right
    // after webgl's failure.
    const payloadRoot = await mkdtemp(join(tmpdir(), 'satus-m1-payload-'))
    try {
      await Bun.write(
        join(payloadRoot, 'package.json'),
        JSON.stringify({ dependencies: {}, devDependencies: {} })
      )
      await mkdir(join(payloadRoot, 'lib/integrations/hubspot'), {
        recursive: true,
      })
      await Bun.write(
        join(payloadRoot, 'lib/integrations/hubspot/index.ts'),
        'export {}\n'
      )

      const source: PayloadSource = {
        root: payloadRoot,
        label: 'test-payload',
        cleanup: async () => undefined,
      }

      // dryRun: true — this calls the real setupAddIntegrations/installBundle
      // against the REAL project tree's resolvePath (not a sandboxed copy),
      // so dryRun is required to guarantee zero writes.
      const result = await setupAddIntegrations(
        ['webgl', 'hubspot'],
        source,
        true
      )

      // The raw throw was caught and collected, not left to propagate —
      // this whole call resolving (not rejecting) IS the M1 fix.
      expect(result.failures.length).toBe(1)
      expect(result.failures[0]?.file).toBe('WebGL / 3D')
      expect(result.failures[0]?.error).toContain('lib/webgl')

      // hubspot, re-added AFTER the failing webgl bundle, still succeeded —
      // the batch did not abort on webgl's failure.
      expect(result.failures.some((f) => f.file === 'HubSpot')).toBe(false)
    } finally {
      await rm(payloadRoot, { recursive: true, force: true })
    }
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
  partialPrefetching: true,
  experimental: {
    taint: true,
    cachedNavigations: true,
    prefetchInlining: true,
  },
}

export default nextConfig
`

  it('flips cacheComponents, partialPrefetching, and experimental.cachedNavigations to false, leaving other flags untouched', () => {
    const result = applyOpsToText(
      nextConfigFixture,
      CACHE_COMPONENTS_DISABLE_TRANSFORM.ops
    )

    expect(result).toContain('cacheComponents: false')
    expect(result).not.toContain('cacheComponents: true')
    expect(result).toContain('partialPrefetching: false')
    expect(result).not.toContain('partialPrefetching: true')
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
  partialPrefetching: true,
  experimental: { cachedNavigations: true },
}
`
    const flipped = applyOpsToText(
      nextConfigFixture,
      CACHE_COMPONENTS_DISABLE_TRANSFORM.ops
    )
    expect(isCacheComponentsDisabled(flipped)).toBe(true)
    expect(flipped).toContain('partialPrefetching: false')
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
    const anchor =
      "Data is fetched inside `'use cache'` functions that call `cacheTag()` and `cacheLife()`."
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

// ---------------------------------------------------------------------------
// P-C3 regression — a kept bundle's dependency pins must survive selfPrune's
// package.json write.
//
// `setupAddIntegrations` (step 8 of `setup()`) calls `addDependencies` per
// kept bundle, which read-modify-writes package.json on disk to pin the
// bundle's dependency versions. `selfPrune` (step 11) used to reuse the
// step-5 in-memory `pkg` object — read from disk BEFORE step 8 ran — and
// write IT back to disk, silently reverting every pin `setupAddIntegrations`
// had just written. `--keep sanity` would report "N dependencies pinned"
// while package.json on disk ended up with none of them, and the resulting
// `bun install && bun run build` failed on module-not-found.
//
// This exercises the REAL script end-to-end (not just its exported helpers):
// a throwaway rsync copy of the repo (node_modules symlinked, matching the
// manual acceptance procedure), run non-interactively with --skip-install
// (no network needed — this only proves the on-disk package.json is
// correct, not that `bun install`/`bun run build` succeed; that's covered
// by the manual acceptance procedure in the PR description).
// ---------------------------------------------------------------------------

describe("P-C3 regression: kept bundle deps survive selfPrune's package.json write", () => {
  it('--keep sanity pins sanity deps to disk through a full (non-dry) run', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-fullrun-'))
    try {
      const rsync = Bun.spawnSync([
        'rsync',
        '-a',
        '--exclude',
        'node_modules',
        '--exclude',
        '.next',
        '--exclude',
        '.git',
        `${projectRoot}/`,
        `${tmpRoot}/`,
      ])
      expect(rsync.exitCode).toBe(0)

      // Symlink the nearest real node_modules so the copy can run bun
      // scripts, mirroring the manual acceptance procedure. Walk up from
      // projectRoot: a git-worktree checkout (as used by this harness) has
      // no node_modules of its own and resolves via the main checkout's —
      // Bun also falls back to its global install cache when no
      // node_modules is found at all, so this is a best-effort speed-up,
      // not a hard requirement.
      let nodeModulesSource: string | undefined
      for (let dir = projectRoot; dir !== dirname(dir); dir = dirname(dir)) {
        const candidate = join(dir, 'node_modules')
        if (await pathExists(candidate)) {
          nodeModulesSource = candidate
          break
        }
      }
      if (nodeModulesSource) {
        await symlink(nodeModulesSource, join(tmpRoot, 'node_modules'))
      }

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'lib/scripts/setup-project.ts',
          '--keep',
          'sanity',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)

      const pkg = JSON.parse(
        await Bun.file(join(tmpRoot, 'package.json')).text()
      ) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
        scripts?: Record<string, string>
      }

      for (const dep of [
        '@portabletext/react',
        '@sanity/asset-utils',
        '@sanity/image-url',
        'next-sanity',
      ]) {
        expect(
          pkg.dependencies?.[dep],
          `missing dependency "${dep}"`
        ).toBeTruthy()
      }
      for (const devDep of ['@sanity/vision', 'sanity']) {
        expect(
          pkg.devDependencies?.[devDep],
          `missing devDependency "${devDep}"`
        ).toBeTruthy()
      }

      // P-B4: self-prune replaces (not deletes) the setup:project entry
      // with a friendly, non-zero-exit stub — Bun's generic "Script not
      // found" is gone, and the script file itself is really deleted.
      expect(pkg.scripts?.['setup:project']).toBe(SETUP_PROJECT_PRUNED_STUB)
      expect(
        await pathExists(join(tmpRoot, 'lib/scripts/setup-project.ts'))
      ).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})

// ---------------------------------------------------------------------------
// issue #382 — selfPrune must not run when steps 8/10 collected (non-thrown)
// transform failures. `applyCodeTransforms` never throws on a single file's
// failure (see its docstring) — it collects into `failures` so the batch can
// finish — but selfPrune used to run regardless, deleting this script (and
// its package.json entry) before the caller ever reported those failures,
// breaking the "just re-run it" recovery the setup() docstring promises.
//
// This exercises the REAL script end-to-end (matching the P-C3 pattern
// above): a throwaway rsync copy of the repo, with one Cache Components
// target file made unreadable (EACCES) to force a genuine, non-required-
// match transform failure — a plain fs error caught and collected by
// `applyCodeTransforms`, not a `RequiredOpMatchError`.
// ---------------------------------------------------------------------------

describe('issue #382: selfPrune is gated on collected transform failures', () => {
  // chmod 000 is a no-op permission check for uid 0 (root can read anything
  // regardless of mode bits) — some CI containers run as root, where this
  // wouldn't reproduce the failure it's testing for.
  const isRoot = (process.getuid?.() ?? -1) === 0

  it.skipIf(isRoot)(
    'a collected (non-thrown) transform failure keeps setup-project.ts and its package.json script entry intact',
    async () => {
      const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-collected-failure-'))
      const targetFile = join(tmpRoot, 'app/llms.txt/route.ts')
      try {
        const rsync = Bun.spawnSync([
          'rsync',
          '-a',
          '--exclude',
          'node_modules',
          '--exclude',
          '.next',
          '--exclude',
          '.git',
          `${projectRoot}/`,
          `${tmpRoot}/`,
        ])
        expect(rsync.exitCode).toBe(0)

        let nodeModulesSource: string | undefined
        for (let dir = projectRoot; dir !== dirname(dir); dir = dirname(dir)) {
          const candidate = join(dir, 'node_modules')
          if (await pathExists(candidate)) {
            nodeModulesSource = candidate
            break
          }
        }
        if (nodeModulesSource) {
          await symlink(nodeModulesSource, join(tmpRoot, 'node_modules'))
        }

        // `--keep ''` (lean/blank) makes `setupCacheComponentsOptOut` run
        // unconditionally (no CMS/storefront kept). Stripping read
        // permission from its llms.txt target makes `applyCodeTransforms`
        // hit a genuine EACCES from `file.text()` — a plain Error, collected
        // into `failures` regardless of whether the op it never got to
        // apply was `required`.
        await chmod(targetFile, 0o000)

        const proc = Bun.spawnSync(
          [
            'bun',
            'run',
            'lib/scripts/setup-project.ts',
            '--keep',
            '',
            '--yes',
            '--skip-install',
          ],
          { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
        )

        // Exit code 3: code-transform failures were collected and reported —
        // see main()'s exit-code contract.
        if (proc.exitCode !== 3) {
          console.error(proc.stdout.toString())
          console.error(proc.stderr.toString())
        }
        expect(proc.exitCode).toBe(3)

        // The whole point of the fix: the setup script and its package.json
        // entry survive a collected-failure run, so it can simply be re-run.
        expect(
          await pathExists(join(tmpRoot, 'lib/scripts/setup-project.ts'))
        ).toBe(true)

        const pkg = JSON.parse(
          await Bun.file(join(tmpRoot, 'package.json')).text()
        ) as { scripts?: Record<string, string> }
        expect(pkg.scripts?.['setup:project']).not.toBe(
          SETUP_PROJECT_PRUNED_STUB
        )
        expect(pkg.scripts?.['test:setup']).toBeTruthy()
      } finally {
        await chmod(targetFile, 0o644).catch(() => undefined)
        await rm(tmpRoot, { recursive: true, force: true })
      }
    },
    60000
  )
})

// -------------------------------------------------------------------------
// Issue #392 — app/(site)/(examples) (the Sanity wiring tutorial at
// `/sanity`) must never ship to a scaffolded project, regardless of which
// integrations are kept. Before pruneExampleRoutes existed, the folder only
// disappeared when Sanity was DROPPED (it lived in the sanity bundle's
// `folders`), so a run that keeps Sanity — the common case — is the one that
// regresses without this test.
//
// Same real end-to-end harness as the P-C3 regression above: an rsync copy
// of the repo (node_modules symlinked), run non-interactively with
// --skip-install.
// ---------------------------------------------------------------------------

describe('Issue #392: app/(site)/(examples) is pruned unconditionally', () => {
  it('--keep sanity still deletes app/(site)/(examples)', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-prune-examples-'))
    try {
      const rsync = Bun.spawnSync([
        'rsync',
        '-a',
        '--exclude',
        'node_modules',
        '--exclude',
        '.next',
        '--exclude',
        '.git',
        `${projectRoot}/`,
        `${tmpRoot}/`,
      ])
      expect(rsync.exitCode).toBe(0)

      let nodeModulesSource: string | undefined
      for (let dir = projectRoot; dir !== dirname(dir); dir = dirname(dir)) {
        const candidate = join(dir, 'node_modules')
        if (await pathExists(candidate)) {
          nodeModulesSource = candidate
          break
        }
      }
      if (nodeModulesSource) {
        await symlink(nodeModulesSource, join(tmpRoot, 'node_modules'))
      }

      expect(
        await pathExists(join(tmpRoot, 'app/(site)/(examples)')),
        'fixture sanity check: app/(site)/(examples) should exist before setup runs'
      ).toBe(true)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'lib/scripts/setup-project.ts',
          '--keep',
          'sanity',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)

      expect(await pathExists(join(tmpRoot, 'app/(site)/(examples)'))).toBe(
        false
      )
      // The catch-all that replaces app/(site)/[...unmatched] must survive —
      // it's the in-chrome 404 handler, not part of the example group.
      expect(
        await pathExists(join(tmpRoot, 'app/(site)/[...slug]/page.tsx'))
      ).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})

// ---------------------------------------------------------------------------
// P-D2 — cancel/EOF guard: stdin closing before a prompt resolves must exit
// 1 with a readable message, never fall through to a silent exit 0.
//
// Runs against the real repo tree directly (no rsync copy needed): with no
// flags, guardedPrompt's stdin-close race fires before guardProjectRoot()'s
// checks would matter and before any mutation, so this is read-only.
// ---------------------------------------------------------------------------

describe('P-D2: stdin EOF guard (guardedPrompt)', () => {
  it('bun run setup:project </dev/null exits 1 with a readable stderr message', async () => {
    const proc = Bun.spawnSync(['bun', 'lib/scripts/setup-project.ts'], {
      cwd: projectRoot,
      stdin: new Response(''), // closed stdin — simulates `</dev/null`
      stdout: 'pipe',
      stderr: 'pipe',
    })

    expect(proc.exitCode).toBe(1)
    const stderr = proc.stderr.toString()
    expect(stderr).toContain('Setup cancelled')
    expect(stderr).toContain('stdin closed')
    expect(stderr).toContain('--preset')
  }, 20000)
})

// ---------------------------------------------------------------------------
// P-D2 (LOW, cross-model review follow-up) — answer-wins ordering:
// guardedPrompt must not false-cancel when a legitimate final answer races
// stdin's `close` event (reproduced: a valid default confirm answer
// immediately followed by pipe closure, e.g. `printf '\n' | script`).
// ---------------------------------------------------------------------------

describe('guardedPrompt (answer-wins ordering)', () => {
  it('a prompt that resolves synchronously (before stdin close) still wins — baseline sanity check', async () => {
    const promptFn = () =>
      new Promise<string>((resolve) => {
        // Both the answer and the close are already-settled by the time
        // Promise.race examines them here, so this alone doesn't exercise
        // the actual race (Promise.race's array-order tie-break already
        // favors index 0 in that case) — see the next test for the real
        // regression repro.
        resolve('yes')
        process.stdin.emit('close')
      })

    const result = await guardedPrompt(promptFn, 'test cancelled')
    expect(result).toBe('yes')
  })

  it('a prompt that resolves one microtask AFTER stdin close still wins (the actual repro: setImmediate defers long enough for the answer to land first)', async () => {
    const promptFn = () =>
      new Promise<string>((resolve) => {
        // This is the real regression repro: stdin closes first (its `eof`
        // promise is already-settled by the time Promise.race runs), and
        // the prompt's answer settles one microtask later — exactly what a
        // real @clack/core resolution racing a piped stream's `close` can
        // look like. Without the setImmediate defer, Promise.race picks
        // the already-settled `eof` and this incorrectly exits as
        // cancelled (verified against the pre-fix implementation).
        process.stdin.emit('close')
        queueMicrotask(() => resolve('no'))
      })

    const result = await guardedPrompt(promptFn, 'test cancelled')
    expect(result).toBe('no')
  })
})

// ---------------------------------------------------------------------------
// P-B6 — --help/-h was computed by parseCliFlags but never checked by
// main(), so it silently fell through into a live interactive run instead
// of printing usage.
// ---------------------------------------------------------------------------

describe('P-B6: --help prints usage and exits 0', () => {
  it('lists every flag and every preset key, and exits 0', async () => {
    const proc = Bun.spawnSync(
      ['bun', 'lib/scripts/setup-project.ts', '--help'],
      {
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )

    expect(proc.exitCode).toBe(0)
    const stdout = proc.stdout.toString()
    expect(stdout).toContain('Usage:')
    expect(stdout).toContain('--preset')
    expect(stdout).toContain('--keep')
    expect(stdout).toContain('--yes')
    expect(stdout).toContain('--skip-install')
    for (const key of Object.keys(PROJECT_PRESETS)) {
      expect(stdout).toContain(key)
    }
  }, 20000)

  it('-h is equivalent to --help', async () => {
    const proc = Bun.spawnSync(['bun', 'lib/scripts/setup-project.ts', '-h'], {
      cwd: projectRoot,
      stdout: 'pipe',
    })
    expect(proc.exitCode).toBe(0)
    expect(proc.stdout.toString()).toContain('Usage:')
  }, 20000)
})

// ---------------------------------------------------------------------------
// P-B3 — a concurrency lock: two setup:project runs racing in one workspace
// used to interleave into a silent, contradictory hybrid (both exit 0).
// ---------------------------------------------------------------------------

describe('P-B3: concurrent setup:project runs', () => {
  it('one run succeeds, the other fails immediately naming the lock', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-lock-'))
    try {
      const rsync = Bun.spawnSync([
        'rsync',
        '-a',
        '--exclude',
        'node_modules',
        '--exclude',
        '.next',
        '--exclude',
        '.git',
        `${projectRoot}/`,
        `${tmpRoot}/`,
      ])
      expect(rsync.exitCode).toBe(0)

      const spawnRun = () =>
        Bun.spawn(
          [
            'bun',
            'run',
            'setup:project',
            '--preset',
            'blank',
            '--yes',
            '--skip-install',
          ],
          { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
        )

      const procA = spawnRun()
      const procB = spawnRun()
      const [exitA, exitB] = await Promise.all([procA.exited, procB.exited])
      const [outA, outB, errA, errB] = await Promise.all([
        new Response(procA.stdout).text(),
        new Response(procB.stdout).text(),
        new Response(procA.stderr).text(),
        new Response(procB.stderr).text(),
      ])

      const exits = [exitA, exitB]
      // clack's p.log.error writes to stdout, not stderr — check both so
      // this doesn't depend on which stream the CLI library picks.
      const combinedOutputs = [outA + errA, outB + errB]

      // Exactly one succeeds, exactly one fails.
      expect(exits.filter((code) => code === 0)).toHaveLength(1)
      expect(exits.filter((code) => code !== 0)).toHaveLength(1)

      // The failing run's message names the lock and gives a recovery step.
      const failingOutput =
        combinedOutputs[exits.findIndex((code) => code !== 0)] ?? ''
      expect(failingOutput).toContain(
        'setup:project run appears to be in progress'
      )
      expect(failingOutput).toContain('.setup-project.lock')
      expect(failingOutput.toLowerCase()).toContain('delete the lock')

      // The lock is cleaned up once both runs have finished.
      expect(await pathExists(join(tmpRoot, '.setup-project.lock'))).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})

// ---------------------------------------------------------------------------
// P-B3 follow-up (cross-model review MEDIUM finding): the lock used to leak
// on SIGINT/SIGTERM — Bun doesn't reliably emit 'exit' for those signals, so
// a `kill -TERM` mid-run (or Ctrl+C outside an active prompt) could leave
// the lock directory behind forever, blocking every future run. Fixed with
// explicit SIGINT/SIGTERM handlers (release + exit non-zero) plus a PID-file
// stale-lock backstop for whatever still gets past those (e.g. SIGKILL).
// ---------------------------------------------------------------------------

describe('P-B3 follow-up: lock survives SIGTERM / stale-lock detection', () => {
  const rsyncCopy = async (tmpRoot: string): Promise<void> => {
    const rsync = Bun.spawnSync([
      'rsync',
      '-a',
      '--exclude',
      'node_modules',
      '--exclude',
      '.next',
      '--exclude',
      '.git',
      `${projectRoot}/`,
      `${tmpRoot}/`,
    ])
    expect(rsync.exitCode).toBe(0)
  }

  it('kill -TERM on a mid-run process releases the lock instead of leaking it', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-sigterm-'))
    try {
      await rsyncCopy(tmpRoot)

      // No flags → fully interactive → hangs at the first prompt once
      // guardProjectRoot()/acquireLock() have already run, giving us a
      // window where the lock exists and the process is still alive to
      // signal. stdin stays open (not `</dev/null`) so this is a genuine
      // "process running, mid-prompt" state, not the P-D2 EOF path.
      const child = Bun.spawn(['bun', 'lib/scripts/setup-project.ts'], {
        cwd: tmpRoot,
        stdin: 'pipe',
        stdout: 'ignore',
        stderr: 'ignore',
      })

      const lockPath = join(tmpRoot, '.setup-project.lock')
      const deadline = Date.now() + 10000
      while (!(await pathExists(lockPath)) && Date.now() < deadline) {
        await Bun.sleep(50)
      }
      expect(await pathExists(lockPath)).toBe(true)

      child.kill('SIGTERM')
      await child.exited

      expect(await pathExists(lockPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a lock left by a dead PID is treated as stale — removed, and the run proceeds', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-stale-'))
    try {
      await rsyncCopy(tmpRoot)

      // A PID guaranteed to be dead: spawn a trivial process and wait for
      // it to exit, then reuse its (now-dead) pid.
      const dead = Bun.spawn(['bun', '-e', 'process.exit(0)'])
      await dead.exited
      const deadPid = dead.pid

      const lockPath = join(tmpRoot, '.setup-project.lock')
      await Bun.$`mkdir -p ${lockPath}`.quiet()
      await Bun.write(join(lockPath, 'pid'), `${deadPid}\n`)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'setup:project',
          '--preset',
          'blank',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      const output = proc.stdout.toString() + proc.stderr.toString()
      if (proc.exitCode !== 0) console.error(output)

      expect(proc.exitCode).toBe(0)
      expect(output.toLowerCase()).toContain('stale')
      expect(output).toContain(String(deadPid))
      // The run replaced the stale lock with its own (and released it on
      // completion) rather than treating it as a genuine collision.
      expect(await pathExists(lockPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a lock left by a LIVE PID is NOT treated as stale — still a genuine collision', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-live-'))
    try {
      await rsyncCopy(tmpRoot)

      // Our own test-runner process is unambiguously alive for the
      // duration of this test.
      const livePid = process.pid

      const lockPath = join(tmpRoot, '.setup-project.lock')
      await Bun.$`mkdir -p ${lockPath}`.quiet()
      await Bun.write(join(lockPath, 'pid'), `${livePid}\n`)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'setup:project',
          '--preset',
          'blank',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      const output = proc.stdout.toString() + proc.stderr.toString()
      expect(proc.exitCode).not.toBe(0)
      expect(output).toContain('setup:project run appears to be in progress')
      // The still-alive owner's lock is left exactly as it was.
      expect(await pathExists(lockPath)).toBe(true)
      expect(await Bun.file(join(lockPath, 'pid')).text()).toContain(
        String(livePid)
      )
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)
})

// ---------------------------------------------------------------------------
// prepare.ts's pending-format marker handling (cross-model review MEDIUM
// finding): the marker is unvalidated — a malformed/partial marker used to
// throw BEFORE unlinking, bricking every subsequent `bun install` on the
// same crash forever; and a format/manifest failure deleted the marker
// anyway, losing the retry.
// ---------------------------------------------------------------------------

describe('prepare.ts pending-format marker (defensive handling)', () => {
  const setupCopy = async (): Promise<string> => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-prepare-'))
    const rsync = Bun.spawnSync([
      'rsync',
      '-a',
      '--exclude',
      'node_modules',
      '--exclude',
      '.next',
      '--exclude',
      '.git', // no .git → prepare.ts's lefthook step always no-ops cleanly
      `${projectRoot}/`,
      `${tmpRoot}/`,
    ])
    expect(rsync.exitCode).toBe(0)

    // Symlink the nearest real node_modules so `bun run format` (oxfmt) can
    // actually run — same rationale as the P-C3 test above.
    for (let dir = projectRoot; dir !== dirname(dir); dir = dirname(dir)) {
      const candidate = join(dir, 'node_modules')
      if (await pathExists(candidate)) {
        await symlink(candidate, join(tmpRoot, 'node_modules'))
        break
      }
    }

    return tmpRoot
  }

  const runPrepare = (cwd: string) =>
    Bun.spawnSync(['bun', 'lib/scripts/prepare.ts'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    })

  it('a malformed marker (invalid JSON) is deleted, not thrown — install survives', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(markerPath, '{ this is not valid json')

      const proc = runPrepare(tmpRoot)

      // Never crashes: prepare.ts must run to completion regardless of a
      // corrupt marker, or `bun install` (which always runs `prepare`)
      // would fail forever on the exact same crash.
      expect(proc.exitCode).toBe(0)
      expect(
        (proc.stdout.toString() + proc.stderr.toString()).toLowerCase()
      ).toContain('malformed')
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a marker missing the required "files" array is deleted, not thrown', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(markerPath, `${JSON.stringify({ notFiles: 'oops' })}\n`)

      const proc = runPrepare(tmpRoot)

      expect(proc.exitCode).toBe(0)
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a listed file that no longer exists is skipped with a note, not a failure', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(
        markerPath,
        `${JSON.stringify({ files: ['lib/scripts/this-file-does-not-exist.ts'] })}\n`
      )

      const proc = runPrepare(tmpRoot)

      expect(proc.exitCode).toBe(0)
      expect(
        (proc.stdout.toString() + proc.stderr.toString()).toLowerCase()
      ).toContain('no longer exists')
      // Nothing left to retry — the marker is cleaned up.
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a real marker is finished successfully: files formatted, manifest regenerated, marker deleted', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      // A real, tracked file — formatting it is a genuine (harmless) no-op
      // since it's already correctly formatted.
      await Bun.write(
        markerPath,
        `${JSON.stringify({ files: ['lib/scripts/utils.ts'] })}\n`
      )

      const proc = runPrepare(tmpRoot)

      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a repeatedly-failing step keeps the marker (with attempts incrementing) up to the cap, then gives up loudly instead of retrying forever', async () => {
    const tmpRoot = await setupCopy()
    try {
      // Force the format step to fail deterministically.
      const pkgPath = join(tmpRoot, 'package.json')
      const pkg = JSON.parse(await Bun.file(pkgPath).text()) as {
        scripts: Record<string, string>
      }
      pkg.scripts.format = 'exit 1'
      await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(
        markerPath,
        `${JSON.stringify({ files: ['lib/scripts/utils.ts'] })}\n`
      )

      // Run PENDING_FORMAT_MAX_ATTEMPTS times: every run but the last keeps
      // the marker with `attempts` incremented; the last one gives up and
      // deletes it instead of looping forever.
      for (let attempt = 1; attempt <= PENDING_FORMAT_MAX_ATTEMPTS; attempt++) {
        const proc = runPrepare(tmpRoot)
        expect(proc.exitCode).toBe(0) // never bricks install, even on failure

        if (attempt < PENDING_FORMAT_MAX_ATTEMPTS) {
          expect(await pathExists(markerPath)).toBe(true)
          const marker = JSON.parse(await Bun.file(markerPath).text()) as {
            attempts?: number
          }
          expect(marker.attempts).toBe(attempt)
          const output = proc.stdout.toString() + proc.stderr.toString()
          expect(output).toContain('will retry')
          expect(output).toContain('bun run format')
        } else {
          expect(await pathExists(markerPath)).toBe(false)
          const output = proc.stdout.toString() + proc.stderr.toString()
          expect(output.toLowerCase()).toContain('giving up')
        }
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})
