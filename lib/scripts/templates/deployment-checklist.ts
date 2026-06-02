/**
 * Deployment checklist template for the client handoff script.
 *
 * Pure render function -- no I/O. `prepare-handoff.ts` gathers the data
 * (project name, configured integrations, date) and writes the result, so the
 * checklist content can be edited here without touching script logic.
 */

export interface DeploymentChecklistData {
  /** Human-readable project name used in the title. */
  projectName: string
  /** Configured integration display names, e.g. `['Sanity', 'Shopify']`. */
  integrations: string[]
  /** ISO date (YYYY-MM-DD) shown in the "Generated:" line. */
  date: string
}

/**
 * Render the deployment checklist markdown. Integration-specific sections are
 * included only when that integration is configured.
 */
export function renderDeploymentChecklist({
  projectName,
  integrations,
  date,
}: DeploymentChecklistData): string {
  const lines: string[] = []

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

  if (integrations.includes('Sanity')) {
    lines.push('## Sanity CMS')
    lines.push('')
    lines.push('- [ ] Production dataset selected')
    lines.push('- [ ] CORS origins configured for production domain')
    lines.push('- [ ] Webhook configured for revalidation')
    lines.push('  - URL: `https://your-domain.com/api/revalidate`')
    lines.push('- [ ] API tokens rotated for production')
    lines.push('')
  }

  if (integrations.includes('Shopify')) {
    lines.push('## Shopify')
    lines.push('')
    lines.push('- [ ] Storefront API access token configured')
    lines.push('- [ ] Webhooks configured for product/collection updates')
    lines.push('- [ ] Test checkout flow in production')
    lines.push('')
  }

  if (integrations.includes('HubSpot')) {
    lines.push('## HubSpot')
    lines.push('')
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
