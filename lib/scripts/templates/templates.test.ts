/**
 * Unit tests for the client-handoff document templates.
 *
 * Run with: bun test lib/scripts/templates/templates.test.ts
 *
 * The handoff CLI (`bun run handoff`) is interactive, so these tests exercise
 * the pure render functions directly to guarantee the templates render the
 * expected handoff documents.
 */

import { describe, expect, it } from 'bun:test'
import { renderDeploymentChecklist } from './deployment-checklist'
import { renderInventory } from './inventory'

describe('renderDeploymentChecklist', () => {
  it('renders the exact document for a project with no integrations', () => {
    const output = renderDeploymentChecklist({
      projectName: 'Test Project',
      integrations: [],
      date: '2026-01-01',
    })

    const expected = `# Test Project - Deployment Checklist

Generated: 2026-01-01

## Pre-Deployment

- [ ] All environment variables configured in hosting platform
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Build passes without errors (\`bun run build\`)
- [ ] TypeScript passes without errors (\`bun typecheck\`)

## Performance

- [ ] Lighthouse score > 90 for Performance
- [ ] Lighthouse score > 90 for Accessibility
- [ ] Images optimized and using next/image
- [ ] No console errors in production

## SEO

- [ ] Meta titles and descriptions set for all pages
- [ ] Open Graph images configured
- [ ] robots.txt configured correctly
- [ ] sitemap.xml generating correctly
- [ ] Canonical URLs set

## Analytics

- [ ] Google Analytics or Tag Manager configured
- [ ] Cookie consent implemented (if required)
- [ ] Privacy policy page exists

## Post-Deployment

- [ ] Verify all pages load correctly
- [ ] Test all forms and interactions
- [ ] Verify analytics receiving data
- [ ] Test on mobile devices
- [ ] Test in different browsers
`

    expect(output).toBe(expected)
  })

  it('includes only the shipped integration sections, in order', () => {
    const output = renderDeploymentChecklist({
      projectName: 'Acme',
      integrations: [
        { name: 'Sanity', configured: true },
        { name: 'HubSpot', configured: true },
      ],
      date: '2026-01-01',
    })

    expect(output).toContain('## Sanity CMS')
    expect(output).toContain('- URL: `https://your-domain.com/api/revalidate`')
    expect(output).toContain('## HubSpot')
    expect(output).not.toContain('## Shopify')

    // Integration sections appear between Pre-Deployment and Performance.
    expect(output.indexOf('## Sanity CMS')).toBeLessThan(
      output.indexOf('## HubSpot')
    )
    expect(output.indexOf('## HubSpot')).toBeLessThan(
      output.indexOf('## Performance')
    )
  })

  it('keeps the section for an installed-but-unconfigured integration and flags it (H7)', () => {
    const output = renderDeploymentChecklist({
      projectName: 'Acme',
      integrations: [{ name: 'Shopify', configured: false }],
      date: '2026-01-01',
    })

    // Section survives even though env isn't configured — a handoff that
    // omits setup steps for shipping code is the bug this guards against.
    expect(output).toContain('## Shopify')
    expect(output).toContain(
      '- [ ] ⚠️ Not yet configured in this environment — see .env.example'
    )
    expect(output).toContain('- [ ] Storefront API access token configured')
  })

  it('omits the warning line for a configured integration', () => {
    const output = renderDeploymentChecklist({
      projectName: 'Acme',
      integrations: [{ name: 'Sanity', configured: true }],
      date: '2026-01-01',
    })

    expect(output).toContain('## Sanity CMS')
    expect(output).not.toContain('Not yet configured')
  })
})

describe('renderInventory', () => {
  it('renders integrations, components, and pages', () => {
    const output = renderInventory({
      date: '2026-01-01',
      integrations: [{ name: 'Sanity', configured: true }],
      uiComponents: ['button', 'select'],
      layoutComponents: ['wrapper'],
      effectComponents: ['parallax'],
      pages: ['', 'about'],
    })

    expect(output).toContain('# Component Inventory')
    expect(output).toContain('Generated: 2026-01-01')
    expect(output).toContain('## Installed Integrations')
    expect(output).toContain('- Sanity')
    expect(output).not.toContain('needs configuration')
    expect(output).toContain('## UI Components')
    expect(output).toContain('- `button`')
    expect(output).toContain('- `select`')
    expect(output).toContain('## Layout Components')
    expect(output).toContain('- `wrapper`')
    expect(output).toContain('## Effect Components')
    expect(output).toContain('- `parallax`')
    expect(output).toContain('## Pages')
    expect(output).toContain('- `/about`')
  })

  it('flags an installed-but-unconfigured integration (H7 — env is a reported axis, not a filter)', () => {
    const output = renderInventory({
      date: '2026-01-01',
      integrations: [{ name: 'Shopify', configured: false }],
      uiComponents: [],
      layoutComponents: [],
      effectComponents: [],
      pages: [],
    })

    expect(output).toContain('- Shopify — installed, needs configuration')
  })

  it('renders the "none installed" fallback when nothing is installed', () => {
    const output = renderInventory({
      date: '2026-01-01',
      integrations: [],
      uiComponents: [],
      layoutComponents: [],
      effectComponents: [],
      pages: [],
    })

    expect(output).toContain('- None installed')
  })

  it('renders scan-error fallbacks when a scan returns null', () => {
    const output = renderInventory({
      date: '2026-01-01',
      integrations: [{ name: 'Sanity', configured: true }],
      uiComponents: null,
      layoutComponents: null,
      effectComponents: null,
      pages: null,
    })

    expect(output).toContain('- Could not scan components')
    expect(output).toContain('- Could not scan layout components')
    expect(output).toContain('- Could not scan effect components')
    expect(output).toContain('- Could not scan pages')
  })
})
