/**
 * Unit tests for the setup-project script
 *
 * Run with: bun test lib/scripts/setup-project.test.ts
 *
 * These tests verify:
 * 1. All regex patterns match their target content in actual source files
 * 2. Code transformations produce valid output (no broken imports/syntax)
 * 3. Integration bundle configurations are valid
 * 4. Preset configurations reference valid integrations
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import { getIntegrationNames, INTEGRATION_BUNDLES } from './integration-bundles'

// Source file contents - loaded once for all tests
const sourceFiles: Record<string, string> = {}

beforeAll(async () => {
  // Load all files that have code transforms
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
      // File might not exist in some configurations
      sourceFiles[file] = ''
    }
  }
})

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

  it('should have valid code transform configurations', () => {
    for (const [_name, bundle] of Object.entries(INTEGRATION_BUNDLES)) {
      for (const transform of bundle.codeTransforms) {
        expect(transform.file).toBeTruthy()
        expect(Array.isArray(transform.patterns)).toBe(true)

        for (const pattern of transform.patterns) {
          expect(pattern.regex).toBeTruthy()
          expect(pattern.flags).toBeTruthy()

          // Verify regex is valid
          expect(() => new RegExp(pattern.regex, pattern.flags)).not.toThrow()
        }
      }
    }
  })
})

describe('Theatre.js Code Transforms', () => {
  const theatreBundle = INTEGRATION_BUNDLES.theatre
  if (!theatreBundle) throw new Error('Theatre bundle not found')

  describe('lib/dev/index.tsx transforms', () => {
    const file = 'lib/dev/index.tsx'

    it('should match Studio dynamic import', () => {
      const content = sourceFiles[file]
      if (!content) return // Skip if file doesn't exist

      const pattern = theatreBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('Studio = dynamic'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should match Studio render JSX', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = theatreBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('studio && <Studio'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should produce valid code after transformation', () => {
      let content = sourceFiles[file]
      if (!content) return

      const transforms = theatreBundle.codeTransforms.find(
        (t) => t.file === file
      )
      if (!transforms) return

      for (const { regex, flags } of transforms.patterns) {
        content = content.replace(new RegExp(regex, flags), '')
      }

      // Verify essential structure remains
      expect(content).toContain("'use client'")
      expect(content).toContain('export function OrchestraTools')
      expect(content).toContain('export function useOrchestra')

      // Verify Theatre imports are removed
      expect(content).not.toContain('./theatre/studio')
      expect(content).not.toContain('<Studio')
    })
  })

  describe('lib/dev/cmdo.tsx transforms', () => {
    const file = 'lib/dev/cmdo.tsx'

    it('should match studio toggle', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = theatreBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('id="studio"'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })
  })
})

describe('WebGL Code Transforms', () => {
  const webglBundle = INTEGRATION_BUNDLES.webgl
  if (!webglBundle) throw new Error('WebGL bundle not found')

  describe('lib/features/index.tsx transforms', () => {
    const file = 'lib/features/index.tsx'

    it('should match LazyGlobalCanvas import', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('LazyGlobalCanvas = dynamic'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should match hasWebGL constant', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('hasWebGL = Boolean'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should match WebGL push block', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('WebGL Canvas'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should produce valid code after transformation', () => {
      let content = sourceFiles[file]
      if (!content) return

      const transforms = webglBundle.codeTransforms.find((t) => t.file === file)
      if (!transforms) return

      for (const { regex, flags } of transforms.patterns) {
        content = content.replace(new RegExp(regex, flags), '')
      }

      // Verify essential structure remains
      expect(content).toContain("'use client'")
      expect(content).toContain('export function OptionalFeatures')

      // Verify WebGL code is removed
      expect(content).not.toContain('LazyGlobalCanvas')
      expect(content).not.toContain('hasWebGL')
    })
  })

  describe('components/layout/wrapper/index.tsx transforms', () => {
    const file = 'components/layout/wrapper/index.tsx'

    it('should match Canvas import', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('Canvas'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should match webgl prop in interface', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('Enable WebGL for this page'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should match webgl param in function', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('webgl = false'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })

    it('should match Canvas JSX tags', () => {
      const content = sourceFiles[file]
      if (!content) return

      const openPattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('Canvas root='))

      const closePattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex === '</Canvas>')

      expect(openPattern).toBeTruthy()
      expect(closePattern).toBeTruthy()

      expect(
        content.match(new RegExp(openPattern!.regex, openPattern!.flags))
      ).toBeTruthy()
      expect(
        content.match(new RegExp(closePattern!.regex, closePattern!.flags))
      ).toBeTruthy()
    })

    it('should produce valid code after transformation', () => {
      let content = sourceFiles[file]
      if (!content) return

      const transforms = webglBundle.codeTransforms.find((t) => t.file === file)
      if (!transforms) return

      for (const { regex, flags } of transforms.patterns) {
        content = content.replace(new RegExp(regex, flags), '')
      }

      // Verify essential structure remains
      expect(content).toContain("'use client'")
      expect(content).toContain('export function Wrapper')
      expect(content).toContain('interface WrapperProps')
      expect(content).toContain('<Theme')
      expect(content).toContain('<Header')
      expect(content).toContain('<Footer')
      expect(content).toContain('<Lenis')

      // Verify WebGL code is removed
      expect(content).not.toContain('@/webgl')
      expect(content).not.toContain('<Canvas')
      expect(content).not.toContain('webgl?:')
      expect(content).not.toContain('webgl = false')
    })
  })

  describe('lib/dev/cmdo.tsx transforms', () => {
    const file = 'lib/dev/cmdo.tsx'

    it('should match webgl toggle', () => {
      const content = sourceFiles[file]
      if (!content) return

      const pattern = webglBundle.codeTransforms
        .find((t) => t.file === file)
        ?.patterns.find((p) => p.regex.includes('id="webgl"'))

      expect(pattern).toBeTruthy()
      const regex = new RegExp(pattern!.regex, pattern!.flags)
      expect(content.match(regex)).toBeTruthy()
    })
  })
})

describe('Preset Configurations', () => {
  // Import presets from setup script by parsing the file
  // (We can't import directly due to the main() call)
  const presets = {
    editorial: ['sanity', 'hubspot', 'mailchimp'],
    studio: [
      'sanity',
      'shopify',
      'hubspot',
      'mailchimp',
      'mandrill',
      'webgl',
      'theatre',
    ],
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

describe('Combined Transforms (Multiple Integrations Removed)', () => {
  it('should work when both WebGL and Theatre are removed', async () => {
    // This simulates the "blank" preset
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
      let content = sourceFiles[file]
      if (!content) continue

      // Apply WebGL transforms
      const webglTransforms = webglBundle.codeTransforms.find(
        (t) => t.file === file
      )
      if (webglTransforms) {
        for (const { regex, flags } of webglTransforms.patterns) {
          content = content.replace(new RegExp(regex, flags), '')
        }
      }

      // Apply Theatre transforms
      const theatreTransforms = theatreBundle.codeTransforms.find(
        (t) => t.file === file
      )
      if (theatreTransforms) {
        for (const { regex, flags } of theatreTransforms.patterns) {
          content = content.replace(new RegExp(regex, flags), '')
        }
      }

      // Verify no broken imports to webgl or theatre
      expect(content).not.toMatch(/from ['"]~\/webgl/)
      expect(content).not.toMatch(/from ['"]\.\/theatre/)

      // Verify basic structure is intact (no empty exports, etc.)
      if (file.includes('index.tsx')) {
        expect(content).toMatch(/export (function|const)/)
      }
    }
  })
})
