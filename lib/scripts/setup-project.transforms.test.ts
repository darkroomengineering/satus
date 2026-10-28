import { beforeAll, describe, expect, it } from 'bun:test'

import type { AstOperation } from './ast-operation-types'
import { applyOpsToText, RequiredOpMatchError } from './ast-transforms'
import {
  getIntegrationEntries,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import { PROJECT_PRESETS } from './setup-project'
import { loadSourceFiles, sourceFiles } from './setup-project.test-helpers'

beforeAll(loadSourceFiles)

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

  // Failure modes this guards: a stripped bundle leaves a package.json script
  // that runs a deleted path, and a bundle declares a script name that
  // package.json does not have (a typo, or a rename on one side only).
  it('every package.json script that runs a bundle path is owned by that bundle', async () => {
    const pkg = (await Bun.file('package.json').json()) as {
      scripts: Record<string, string>
    }
    for (const [id, bundle] of getIntegrationEntries()) {
      for (const name of bundle.scripts ?? []) {
        expect(
          pkg.scripts[name],
          `${id} declares missing script ${name}`
        ).toBeDefined()
      }
      // Plain substring match on the literal paths a bundle declares. It
      // does not catch a script that reaches a bundle path indirectly (a
      // script that imports one, a shell wrapper) or a path that shares a
      // prefix with an unrelated one, so it is a tripwire, not proof.
      for (const [name, command] of Object.entries(pkg.scripts)) {
        const owned = [...bundle.folders, ...bundle.files].some((path) =>
          command.includes(path)
        )
        if (!owned) continue
        expect(
          bundle.scripts ?? [],
          `script ${name} runs a ${id} path but ${id} does not list it in scripts`
        ).toContain(name)
      }
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
            'syncUnusedParameterPrefix',
          ]).toContain(op.kind)

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
      // Not additive, but it only ever renames toward what the body reads,
      // so after a re-add it restores the name the re-added code needs.
      'syncUnusedParameterPrefix',
    ]

    for (const [_name, bundle] of getIntegrationEntries()) {
      for (const transform of bundle.addTransforms ?? []) {
        expect(transform.file).toBeTruthy()
        expect(Array.isArray(transform.ops)).toBe(true)

        for (const op of transform.ops) {
          expect(additiveKinds).toContain(op.kind)

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

  // With `force: true`, the only call mode `installBundle` uses, an
  // overwriteFiles entry for a path also in the same bundle's `files` is a
  // redundant no-op: copyBundleFiles already force-overwrites it.
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

  // Symmetry: every file named in a bundle's codeTransforms must be covered by
  // overwriteFiles OR an addTransforms entry, so every removal is reversible.
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

      expect(result).toContain("'use client'")
      expect(result).toContain('export function OrchestraTools')
      expect(result).toContain('export function useOrchestra')

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

      expect(result).not.toContain('id="studio"')
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

        expect(result).not.toContain('@theatre/core')
        expect(result).not.toContain('@/dev/theatre')
        expect(result).not.toContain('useTheatre')
        expect(result).not.toContain('useCurrentSheet')
        expect(result).not.toContain('sheet')

        expect(result).toContain(`export function ${exportName}`)
        expect(result).toContain(simName)
        expect(result).toContain('useFrame')
      })
    })
  }
})

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

      expect(result).toContain("'use client'")
      expect(result).toContain('export function OptionalFeatures')
      expect(result).toContain('OrchestraTools')

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

      expect(result).toContain('export function Wrapper')
      expect(result).toContain('interface WrapperProps')
      expect(result).toContain('<Theme')
      expect(result).toContain('<Header')
      expect(result).toContain('<Footer')
      expect(result).toContain('<Lenis')

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

      expect(result).not.toContain('id="webgl"')
      expect(result).toContain('id="studio"')
    })
  })
})

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

// RequiredOpMatchError: a `required: true` op that matches nothing must fail
// the whole run loudly, not silently leave a broken tree.

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
  it('single required op: container present without the construct no-ops (already applied)', () => {
    const src = 'export function buildBody() {\n  return 1\n}\n'
    const ops: AstOperation[] = [
      {
        kind: 'replaceFunctionBody',
        functionName: 'buildBody',
        replacement: '{\n  return 2\n}',
        required: true,
      },
    ]
    // First application replaces the body; buildBody itself survives.
    const applied = applyOpsToText(src, ops)
    expect(applied).not.toBe(src)
    expect(applyOpsToText(applied, ops)).toBe(applied)
  })

  it('single required op: a missing container throws even on a byte-identical file', () => {
    // buildBody renamed: the op misses AND nothing else changes the file,
    // but the op's premise is gone.
    const drifted = 'export function composeBody() {\n  return 1\n}\n'
    expect(() =>
      applyOpsToText(drifted, [
        {
          kind: 'replaceFunctionBody',
          functionName: 'buildBody',
          replacement: '{\n  return 2\n}',
          required: true,
        },
      ])
    ).toThrow(RequiredOpMatchError)
  })

  it('re-applying a real bundle transform to an already-stripped file no-ops', () => {
    // A required op late in setupLean's union fails after lib/seo/routes.ts was
    // already stripped and written; the retry reapplies the same ops to the
    // stripped file and must not throw.
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

  // Drift scenario "a future rename moves getCmsRoutes", proven against the
  // REAL sanity bundle ops and REAL (mutated) source, not a synthetic fixture.
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

  // Drift scenario: the shared revalidate route's sanity dispatch is renamed
  // or restructured, proven against the real shared-file ops.
  it('drifted fixture: renaming the revalidate route guard makes the sanity strip fail loudly', () => {
    const content = sourceFiles['app/api/revalidate/route.ts']
    const bundle = INTEGRATION_BUNDLES.sanity
    const transform = bundle?.codeTransforms.find(
      (t) => t.file === 'app/api/revalidate/route.ts'
    )
    if (!(content && transform)) return

    // The import op still matches (the file changes) while the guard
    // variable and its dispatch no longer do — partial application, which is
    // exactly what the required-match contract must refuse.
    const drifted = content.replaceAll('isSanityWebhook', 'isSanityHook')

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

describe('next.config.ts AST Transforms', () => {
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

  // Formatting-variant fixture: indentation and quote style differ from the
  // canonical fixture.
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
    expect(result).toContain('gsap')
    expect(result).toContain('@sanity/client')
  })

  it('should handle formatting variants the old regex would have missed', () => {
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

      expect(result).not.toMatch(/from ['"]@\/webgl/)
      expect(result).not.toMatch(/from ['"]\.\/theatre/)

      if (file.endsWith('index.tsx')) {
        expect(result).toMatch(/export (?<keyword>function|const)/)
      }
    }
  })
})

// Additive transforms: remove then add round trips on the real sources (the
// re-add step applied to the lean state `setup:project` produces).
describe('Additive Transforms (remove → add round trips)', () => {
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

    expect(applyOpsToText(restored, additive.ops)).toBe(restored)

    return { lean, restored }
  }

  it('webgl: lib/features/index.tsx regains the root canvas wiring', () => {
    const result = roundTrip('webgl', 'lib/features/index.tsx')
    if (!result) return

    expect(result.lean).not.toContain('LazyWebGLCanvas')
    expect(result.lean).not.toContain('key="webgl"')
    expect(result.restored).toContain('const LazyWebGLCanvas = lazy(')
    expect(result.restored).toContain('<Suspense key="webgl" fallback={null}>')
    expect(result.restored).not.toContain('next/dynamic')
    expect(result.restored).toContain('@/webgl/components/canvas')
    expect(result.restored).toContain('<LazyWebGLCanvas root />')
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
    expect(count(result.restored, 'id="webgl"')).toBe(1)
  })

  it('sanity: next.config.ts regains package imports exactly once', () => {
    const result = roundTrip('sanity', 'next.config.ts')
    if (!result) return

    // The optimizer never allows cdn.sanity.io, with or without Sanity: its
    // images reach the browser through components/ui/image's loader.
    expect(result.lean).not.toContain("hostname: 'cdn.sanity.io'")
    expect(result.restored).not.toContain("hostname: 'cdn.sanity.io'")
    expect(count(result.restored, "'@sanity/client'")).toBe(1)
    expect(count(result.restored, "'@sanity/image-url'")).toBe(1)
    expect(count(result.restored, "'@sanity/asset-utils'")).toBe(1)
    expect(count(result.restored, "'@portabletext/react'")).toBe(1)
    expect(count(result.restored, 'cdn.shopify.com')).toBe(1)
  })

  it('shopify: next.config.ts regains the cdn.shopify.com remotePattern exactly once', () => {
    const result = roundTrip('shopify', 'next.config.ts')
    if (!result) return

    expect(result.lean).not.toContain('cdn.shopify.com')
    expect(count(result.restored, 'cdn.shopify.com')).toBe(1)
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

  it('sanity: app/api/revalidate/route.ts regains its guard and dispatch exactly once', () => {
    const result = roundTrip('sanity', 'app/api/revalidate/route.ts')
    if (!result) return

    expect(result.lean).not.toContain('sanityRevalidate')
    expect(count(result.restored, 'sanityRevalidate')).toBe(2) // import + dispatch
    expect(count(result.restored, 'const isSanityWebhook')).toBe(1)
    expect(count(result.restored, 'const isShopifyWebhook')).toBe(1)
  })

  it('shopify: app/api/revalidate/route.ts regains its guard and dispatch exactly once', () => {
    const result = roundTrip('shopify', 'app/api/revalidate/route.ts')
    if (!result) return

    expect(result.lean).not.toContain('shopifyRevalidate')
    expect(count(result.restored, 'shopifyRevalidate')).toBe(2) // import + dispatch
    expect(count(result.restored, 'const isShopifyWebhook')).toBe(1)
    expect(count(result.restored, 'const isSanityWebhook')).toBe(1)
  })
})
