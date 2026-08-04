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

import { generatePageContent } from './generate-page'

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
