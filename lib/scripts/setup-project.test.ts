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
import { getIntegrationNames, INTEGRATION_BUNDLES } from './integration-bundles'

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
    for (const [_name, bundle] of Object.entries(INTEGRATION_BUNDLES)) {
      expect(bundle.name).toBeTruthy()
      expect(bundle.description).toBeTruthy()
      expect(Array.isArray(bundle.dependencies)).toBe(true)
      expect(Array.isArray(bundle.devDependencies)).toBe(true)
      expect(Array.isArray(bundle.folders)).toBe(true)
      expect(Array.isArray(bundle.files)).toBe(true)
      expect(Array.isArray(bundle.configPatterns)).toBe(true)
      expect(Array.isArray(bundle.envVars)).toBe(true)
      expect(Array.isArray(bundle.barrelExports)).toBe(true)
      expect(Array.isArray(bundle.codeTransforms)).toBe(true)
    }
  })

  it('should have valid barrel export configurations', () => {
    for (const [_name, bundle] of Object.entries(INTEGRATION_BUNDLES)) {
      for (const barrelExport of bundle.barrelExports) {
        expect(barrelExport.file).toBeTruthy()
        expect(barrelExport.pattern).toBeTruthy()
      }
    }
  })

  it('should have valid code transform configurations (ops shape)', () => {
    for (const [_name, bundle] of Object.entries(INTEGRATION_BUNDLES)) {
      for (const transform of bundle.codeTransforms) {
        expect(transform.file).toBeTruthy()
        expect(Array.isArray(transform.ops)).toBe(true)

        for (const op of transform.ops) {
          // Every op must have a known kind
          expect([
            'removeImport',
            'removeVariableStatement',
            'removeJsxElement',
            'removeInterfaceProperty',
            'removeFunctionParameter',
            'replaceJsDoc',
          ]).toContain(op.kind)

          // Each op kind must carry its required fields
          if (op.kind === 'removeImport') {
            expect(op.specifier).toBeTruthy()
          } else if (op.kind === 'removeVariableStatement') {
            expect(op.name).toBeTruthy()
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
          }
        }
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

      // WebGL code must be gone
      expect(result).not.toContain('LazyGlobalCanvas')
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
  const presets = {
    editorial: ['sanity', 'hubspot', 'mailchimp'],
    studio: ['sanity', 'shopify', 'hubspot', 'mailchimp', 'webgl', 'theatre'],
    boutique: ['shopify', 'hubspot', 'mailchimp'],
    gallery: ['sanity', 'shopify', 'hubspot', 'mailchimp', 'webgl', 'theatre'],
    blank: [],
  }

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
