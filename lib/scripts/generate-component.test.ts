/**
 * Unit tests for lib/scripts/generate-component.ts's pure template builder.
 *
 * Run with: bun test lib/scripts/generate-component.test.ts
 *
 * Covers the P-C9 regression (generated imports must pass `oxfmt --check`'s
 * import-grouping rule out of the box).
 */

import { describe, expect, it } from 'bun:test'

import { generateComponentContent } from './generate-component'

describe('generateComponentContent — import grouping (P-C9)', () => {
  it('separates the external (clsx/react) group from the sibling CSS import', () => {
    const content = generateComponentContent('audit-widget', {
      category: 'ui',
    })
    expect(content).toContain(
      "import type { HTMLAttributes, ReactNode } from 'react'\n\nimport s from './audit-widget.module.css'"
    )
  })

  it('keeps the blank line when the component is a client component', () => {
    const content = generateComponentContent('audit-widget', {
      category: 'ui',
      client: true,
    })
    expect(content.startsWith("'use client'\n\n")).toBe(true)
    expect(content).toContain(
      "import type { HTMLAttributes, ReactNode } from 'react'\n\nimport s from './audit-widget.module.css'"
    )
  })

  it('builds a valid PascalCase component name for a hyphenated component name', () => {
    const content = generateComponentContent('audit-widget', {
      category: 'ui',
    })
    expect(content).toContain('export function AuditWidget(')
    expect(content).toContain('interface AuditWidgetProps')
  })
})
