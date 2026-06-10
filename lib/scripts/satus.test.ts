/**
 * Unit tests for the `satus add` CLI pure helpers.
 *
 * Run with: bun test lib/scripts/satus.test.ts
 *
 * Covers argument parsing, transitive `requires` resolution, the installed
 * probe, and the barrel-line restore helpers. Disk-writing steps are
 * exercised by the Phase 3 round-trip e2e.
 */

import { describe, expect, it } from 'bun:test'
import { INTEGRATION_BUNDLES } from './integration-bundles'
import {
  bundleProbePath,
  findBarrelLine,
  insertBarrelLine,
  parseAddArgs,
  resolveAddSet,
} from './satus'

// ---------------------------------------------------------------------------
// parseAddArgs
// ---------------------------------------------------------------------------

describe('parseAddArgs', () => {
  it('separates plugins from flags', () => {
    const { plugins, flags } = parseAddArgs([
      'sanity',
      'webgl',
      '--from',
      '.',
      '--dry-run',
      '--yes',
    ])

    expect(plugins).toEqual(['sanity', 'webgl'])
    expect(flags.from).toBe('.')
    expect(flags.dryRun).toBe(true)
    expect(flags.yes).toBe(true)
    expect(flags.force).toBe(false)
    expect(flags.skipInstall).toBe(false)
    expect(flags.ref).toBeUndefined()
  })

  it('parses --skip-install', () => {
    const { flags } = parseAddArgs(['shopify', '--skip-install', '--yes'])
    expect(flags.skipInstall).toBe(true)
    expect(flags.yes).toBe(true)
  })

  it('supports the --flag=value form', () => {
    const { flags } = parseAddArgs(['theatre', '--from=../satus', '--ref=v2'])
    expect(flags.from).toBe('../satus')
    expect(flags.ref).toBe('v2')
  })

  it('supports --ref with a separate value', () => {
    const { flags } = parseAddArgs(['sanity', '--ref', '6f49149', '--force'])
    expect(flags.ref).toBe('6f49149')
    expect(flags.force).toBe(true)
  })

  it('fails loudly when a value flag has no value', () => {
    expect(() => parseAddArgs(['sanity', '--from'])).toThrow(
      '--from requires a value'
    )
    expect(() => parseAddArgs(['sanity', '--from', '--dry-run'])).toThrow(
      '--from requires a value'
    )
  })

  it('fails loudly on unknown flags', () => {
    expect(() => parseAddArgs(['sanity', '--frmo', '.'])).toThrow(
      'Unknown flag: --frmo'
    )
  })
})

// ---------------------------------------------------------------------------
// resolveAddSet — transitive `requires` resolution
// ---------------------------------------------------------------------------

describe('resolveAddSet', () => {
  it('resolves a standalone plugin to itself', () => {
    expect(resolveAddSet(['sanity'])).toEqual({
      order: ['sanity'],
      implied: [],
    })
  })

  it('pulls in required plugins before the requester (theatre → webgl)', () => {
    const { order, implied } = resolveAddSet(['theatre'])

    expect(order).toEqual(['webgl', 'theatre'])
    expect(implied).toEqual(['webgl'])
  })

  it('does not mark explicitly requested dependencies as implied', () => {
    const { order, implied } = resolveAddSet(['theatre', 'webgl'])

    expect(order).toEqual(['webgl', 'theatre'])
    expect(implied).toEqual([])
  })

  it('deduplicates repeated requests', () => {
    const { order } = resolveAddSet(['webgl', 'webgl', 'theatre'])
    expect(order).toEqual(['webgl', 'theatre'])
  })

  it('fails loudly on unknown plugin ids', () => {
    expect(() => resolveAddSet(['sanityy'])).toThrow('Unknown plugin "sanityy"')
  })
})

// ---------------------------------------------------------------------------
// bundleProbePath — installed detection
// ---------------------------------------------------------------------------

describe('bundleProbePath', () => {
  it('uses the first folder as the installed probe', () => {
    const sanity = INTEGRATION_BUNDLES.sanity
    if (!sanity) throw new Error('sanity bundle not found')
    expect(bundleProbePath(sanity)).toBe('lib/integrations/sanity')
  })

  it('every bundle has a probe path', () => {
    for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
      expect(bundleProbePath(bundle)).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// Barrel-line restore helpers
// ---------------------------------------------------------------------------

describe('findBarrelLine', () => {
  const barrel = `export * from './accordion'
export * from './marquee'
export * from './sanity-image'
`

  it('finds the line matching a removal pattern', () => {
    expect(findBarrelLine(barrel, 'sanity-image')).toBe(
      "export * from './sanity-image'"
    )
  })

  it('returns undefined when no line matches', () => {
    expect(findBarrelLine(barrel, 'animated-gradient')).toBeUndefined()
  })
})

describe('insertBarrelLine', () => {
  it('inserts in sorted position among export lines', () => {
    const barrel = `export * from './accordion'
export * from './tabs'
`
    const result = insertBarrelLine(barrel, "export * from './marquee'")

    expect(result).toBe(`export * from './accordion'
export * from './marquee'
export * from './tabs'
`)
  })

  it('appends after the last export when it sorts last', () => {
    const barrel = `export * from './accordion'
export * from './marquee'
`
    const result = insertBarrelLine(barrel, "export * from './tabs'")

    expect(result).toBe(`export * from './accordion'
export * from './marquee'
export * from './tabs'
`)
  })

  it('is idempotent when the line already exists', () => {
    const barrel = `export * from './accordion'
export * from './sanity-image'
`
    expect(insertBarrelLine(barrel, "export * from './sanity-image'")).toBe(
      barrel
    )
  })

  it('creates content for an empty barrel', () => {
    expect(insertBarrelLine('', "export * from './sanity-image'")).toBe(
      "export * from './sanity-image'\n"
    )
  })

  it('appends to a file without export lines', () => {
    const result = insertBarrelLine(
      '// barrel\n',
      "export * from './sanity-image'"
    )
    expect(result).toBe("// barrel\nexport * from './sanity-image'\n")
  })

  it('keeps comment headers above the sorted insert', () => {
    const barrel = `// UI components barrel
export * from './accordion'
export * from './tabs'
`
    const result = insertBarrelLine(barrel, "export * from './marquee'")

    expect(result.startsWith('// UI components barrel\n')).toBe(true)
    expect(result.indexOf('./accordion')).toBeLessThan(
      result.indexOf('./marquee')
    )
    expect(result.indexOf('./marquee')).toBeLessThan(result.indexOf('./tabs'))
  })
})
