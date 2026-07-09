/**
 * Deployment checklist template for the client handoff script.
 *
 * Pure render function -- no I/O. `prepare-handoff.ts` gathers the data
 * (project name, shipped integrations, date) and writes the result, so the
 * checklist content can be edited here without touching script logic.
 */

/**
 * An integration that ships on disk (audit H7 — presence = disk, not
 * presence = configured env). `configured` reports whether the integration's
 * env schema currently validates in this shell — a reported axis, not a
 * filter: unconfigured integrations still appear, with `configured: false`.
 */
export interface IntegrationStatus {
  /** Display name, e.g. 'Sanity', 'Shopify'. */
  name: string
  /** Whether the integration's env vars currently validate in this shell. */
  configured: boolean
}

export interface DeploymentChecklistData {
  /** Human-readable project name used in the title. */
  projectName: string
  /** Integrations that ship on disk, each with its env-configured status. */
  integrations: IntegrationStatus[]
  /** ISO date (YYYY-MM-DD) shown in the "Generated:" line. */
  date: string
}

const NEEDS_CONFIG_LINE =
  '- [ ] ⚠️ Not yet configured in this environment — see .env.example'

/**
 * Render the deployment checklist markdown. Integration-specific sections are
 * included whenever that integration ships on disk — regardless of whether
 * its env vars are configured in the current shell, since a section that's
 * silently dropped is a missed setup step for code that's actually shipping.
 * An unconfigured integration's section gets an extra warning line up front.
 */
export function renderDeploymentChecklist({
  projectName,
  integrations,
  date,
}: DeploymentChecklistData): string {
  const lines: string[] = []
  const find = (name: string): IntegrationStatus | undefined =>
    integrations.find((integration) => integration.name === name)

  lines.push(`# ${projectName} - Deployment Checklist`)
  lines.push('')
  lines.push(`Generated: ${date}`)
  lines.push('')

  lines.push('## Pre-Deployment')
  lines.push('')
  lines.push('- [ ] All environment variables configured in hosting platform')
  lines.push('- [ ] Custom domain configured')
  lines.push('- [ ] SSL certificate active')
  lines.push('- [ ] Build passes without errors (`bun run build`)')
  lines.push('- [ ] TypeScript passes without errors (`bun typecheck`)')
  lines.push('')

  const sanity = find('Sanity')
  if (sanity) {
    lines.push('## Sanity CMS')
    lines.push('')
    if (!sanity.configured) lines.push(NEEDS_CONFIG_LINE)
    lines.push('- [ ] Production dataset selected')
    lines.push('- [ ] CORS origins configured for production domain')
    lines.push('- [ ] Webhook configured for revalidation')
    lines.push('  - URL: `https://your-domain.com/api/revalidate`')
    lines.push('- [ ] API tokens rotated for production')
    lines.push('')
  }

  const shopify = find('Shopify')
  if (shopify) {
    lines.push('## Shopify')
    lines.push('')
    if (!shopify.configured) lines.push(NEEDS_CONFIG_LINE)
    lines.push('- [ ] Storefront API access token configured')
    lines.push('- [ ] Webhooks configured for product/collection updates')
    lines.push('- [ ] Test checkout flow in production')
    lines.push('')
  }

  const hubspot = find('HubSpot')
  if (hubspot) {
    lines.push('## HubSpot')
    lines.push('')
    if (!hubspot.configured) lines.push(NEEDS_CONFIG_LINE)
    lines.push('- [ ] API access token configured')
    lines.push('- [ ] Form IDs updated for production forms')
    lines.push('- [ ] Test form submissions')
    lines.push('')
  }

  lines.push('## Performance')
  lines.push('')
  lines.push('- [ ] Lighthouse score > 90 for Performance')
  lines.push('- [ ] Lighthouse score > 90 for Accessibility')
  lines.push('- [ ] Images optimized and using next/image')
  lines.push('- [ ] No console errors in production')
  lines.push('')

  lines.push('## SEO')
  lines.push('')
  lines.push('- [ ] Meta titles and descriptions set for all pages')
  lines.push('- [ ] Open Graph images configured')
  lines.push('- [ ] robots.txt configured correctly')
  lines.push('- [ ] sitemap.xml generating correctly')
  lines.push('- [ ] Canonical URLs set')
  lines.push('')

  lines.push('## Analytics')
  lines.push('')
  lines.push('- [ ] Google Analytics or Tag Manager configured')
  lines.push('- [ ] Cookie consent implemented (if required)')
  lines.push('- [ ] Privacy policy page exists')
  lines.push('')

  lines.push('## Post-Deployment')
  lines.push('')
  lines.push('- [ ] Verify all pages load correctly')
  lines.push('- [ ] Test all forms and interactions')
  lines.push('- [ ] Verify analytics receiving data')
  lines.push('- [ ] Test on mobile devices')
  lines.push('- [ ] Test in different browsers')
  lines.push('')

  return lines.join('\n')
}
