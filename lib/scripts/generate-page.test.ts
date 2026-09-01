/**
 * Unit tests for lib/scripts/generate-page.ts's pure template builder.
 *
 * Run with: bun test lib/scripts/generate-page.test.ts
 *
 * Covers the P-C8 regression (hyphenated page names must not break the
 * generated identifier) and the P-C9 regression (generated imports must
 * pass `oxfmt --check`'s import-grouping rule out of the box).
 */

import { describe, expect, it } from 'bun:test'

import {
  availablePageCapabilities,
  detectPageCapabilities,
  generatePageContent,
  PAGE_CAPABILITIES,
  type PageCapabilityId,
} from './generate-page'
import { pathExists, resolvePath } from './utils'

describe('generatePageContent — identifier safety (P-C8)', () => {
  it('builds a valid PascalCase function name for a hyphenated page name', () => {
    const content = generatePageContent('audit-page', {})
    expect(content).toContain('export default function AuditPagePage()')
    // The identifier itself must never contain the raw hyphen.
    expect(content).not.toContain('function Audit-page')
  })

  it('builds a valid PascalCase function name for a multi-hyphen page name', () => {
    const content = generatePageContent('my-cool-landing', {})
    expect(content).toContain('export default function MyCoolLandingPage()')
  })

  it('keeps a single-word page name working as before', () => {
    const content = generatePageContent('about', {})
    expect(content).toContain('export default function AboutPage()')
  })

  it('uses the PascalCase name for the async sanity variant too', () => {
    const content = generatePageContent('audit-page', { sanity: true })
    expect(content).toContain('export default async function AuditPagePage()')
  })

  it('still uses human-readable display text for h1/metadata (not the identifier)', () => {
    const content = generatePageContent('audit-page', {})
    expect(content).toContain('<h1>Audit-page</h1>')
    expect(content).toContain(`title: 'Audit-page'`)
  })
})

describe('generatePageContent — import grouping (P-C9)', () => {
  it('separates external and internal (@/) imports with a blank line', () => {
    const content = generatePageContent('about', {})
    expect(content).toContain(
      "import type { Metadata } from 'next'\n\nimport { Wrapper } from '@/components/layout/wrapper'"
    )
  })

  it('keeps the external sanity import out of the internal group', () => {
    const content = generatePageContent('about', { sanity: true })
    const importBlock = content.split('\n\n')[0]
    // next-sanity/live is external; it must appear before the blank line
    // that separates external imports from the @/-aliased internal group.
    expect(importBlock).toContain(`from 'next-sanity/live'`)
    expect(importBlock).not.toContain('@/')
  })

  it('keeps a single blank line between the external and internal groups regardless of options', () => {
    const content = generatePageContent('about', {
      sanity: true,
      shopify: true,
      webgl: true,
      css: true,
    })
    const lines = content.split('\n')
    const firstInternalIndex = lines.findIndex((line) =>
      line.includes("from '@/")
    )
    expect(lines[firstInternalIndex - 1]).toBe('')
  })
})

// ---------------------------------------------------------------------------
// M2 — the integration prompt offered every bundle while the template builder
// understood only three of them, so picking HubSpot, Mailchimp, or Theatre
// changed nothing, and a scaffold that dropped an integration still offered
// it. The list is local now, and filtered by what the project still has.
// ---------------------------------------------------------------------------

describe('page capabilities (M2)', () => {
  it('offers exactly the three capabilities the template builder implements', () => {
    expect(PAGE_CAPABILITIES.map((c) => c.value)).toEqual([
      'webgl',
      'sanity',
      'shopify',
    ])
    for (const capability of PAGE_CAPABILITIES) {
      expect(capability.label).toBeTruthy()
      expect(capability.hint).toBeTruthy()
    }
  })

  it('every offered capability actually changes the generated page', () => {
    const plain = generatePageContent('about', {})
    for (const capability of PAGE_CAPABILITIES) {
      const withCapability = generatePageContent('about', {
        [capability.value]: true,
      })
      expect(withCapability).not.toBe(plain)
    }
  })

  it('drops a capability whose integration is gone from the project', () => {
    const present = new Set<PageCapabilityId>(['webgl'])
    expect(
      availablePageCapabilities((id) => present.has(id)).map((c) => c.value)
    ).toEqual(['webgl'])
  })

  it('returns nothing when the project kept none of the three', () => {
    expect(availablePageCapabilities(() => false)).toEqual([])
  })

  // Deliberately not "this repo has all three": this test ships with every
  // scaffolded project, so it asserts the RULE (a capability is offered
  // exactly when its code is on disk) rather than a capability set that a
  // scaffold is free to have pruned.
  it('offers a capability exactly when its code is present', async () => {
    const present = await detectPageCapabilities()

    expect(present.has('sanity')).toBe(
      await pathExists(resolvePath('lib/integrations/sanity'))
    )
    expect(present.has('shopify')).toBe(
      await pathExists(resolvePath('lib/integrations/shopify'))
    )
    expect(present.has('webgl')).toBe(
      await pathExists(resolvePath('lib/webgl'))
    )
  })
})
