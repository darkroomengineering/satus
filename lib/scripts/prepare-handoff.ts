#!/usr/bin/env bun
/**
 * Client Handoff Preparation Script
 *
 * Prepares the codebase for delivery to clients by:
 * - Validating documentation
 * - Swapping README with production version
 * - Removing example pages
 * - Optionally removing dev tools
 * - Generating component inventory
 * - Creating deployment checklist
 *
 * Usage:
 *   bun run handoff
 *   bun run handoff --dry-run
 */

import * as p from '@clack/prompts'
import { getConfiguredIntegrations } from '~/integrations/check-integration'

interface HandoffOptions {
  dryRun: boolean
  projectName: string
  removeExamples: boolean
  removeDevTools: boolean
  swapReadme: boolean
}

/**
 * Check if a file exists
 */
const fileExists = async (path: string): Promise<boolean> => {
  try {
    return await Bun.file(path).exists()
  } catch {
    return false
  }
}

/**
 * Remove a directory recursively
 */
const removeDir = async (path: string, dryRun: boolean): Promise<boolean> => {
  try {
    const fullPath = `${process.cwd()}/${path}`
    if (!(await fileExists(fullPath))) return false

    if (!dryRun) {
      await Bun.$`rm -rf ${fullPath}`.quiet()
    }
    return true
  } catch {
    return false
  }
}

/**
 * Swap README.md with PROD-README.md content
 */
const swapReadme = async (
  projectName: string,
  dryRun: boolean
): Promise<boolean> => {
  try {
    const prodReadmePath = `${process.cwd()}/PROD-README.md`
    const readmePath = `${process.cwd()}/README.md`

    if (!(await fileExists(prodReadmePath))) {
      p.log.warn('PROD-README.md not found, skipping README swap')
      return false
    }

    let content = await Bun.file(prodReadmePath).text()

    // Replace placeholders
    content = content.replace(/\[PROJECT NAME\]/g, projectName)
    content = content.replace(/\[your-domain\.com\]/g, 'your-domain.com')

    if (!dryRun) {
      // Backup original README
      const originalReadme = await Bun.file(readmePath).text()
      await Bun.write(`${process.cwd()}/README.original.md`, originalReadme)

      // Write new README
      await Bun.write(readmePath, content)

      // Remove PROD-README
      await Bun.$`rm -f ${prodReadmePath}`.quiet()
    }

    return true
  } catch (error) {
    p.log.error(`Failed to swap README: ${error}`)
    return false
  }
}

/**
 * Generate component inventory
 */
const generateInventory = async (dryRun: boolean): Promise<string> => {
  const inventory: string[] = []

  inventory.push('# Component Inventory')
  inventory.push('')
  inventory.push(`Generated: ${new Date().toISOString().split('T')[0]}`)
  inventory.push('')

  // Configured integrations
  const integrations = getConfiguredIntegrations()
  inventory.push('## Active Integrations')
  inventory.push('')
  if (integrations.length > 0) {
    for (const integration of integrations) {
      inventory.push(`- ${integration}`)
    }
  } else {
    inventory.push('- None configured')
  }
  inventory.push('')

  // Scan components directory
  inventory.push('## UI Components')
  inventory.push('')
  try {
    const uiComponents = await Array.fromAsync(
      new Bun.Glob('*/index.tsx').scan({
        cwd: `${process.cwd()}/components/ui`,
      })
    )
    for (const comp of uiComponents.sort()) {
      const name = comp.replace('/index.tsx', '')
      inventory.push(`- \`${name}\``)
    }
  } catch {
    inventory.push('- Could not scan components')
  }
  inventory.push('')

  // Scan layout components
  inventory.push('## Layout Components')
  inventory.push('')
  try {
    const layoutComponents = await Array.fromAsync(
      new Bun.Glob('*/index.tsx').scan({
        cwd: `${process.cwd()}/components/layout`,
      })
    )
    for (const comp of layoutComponents.sort()) {
      const name = comp.replace('/index.tsx', '')
      inventory.push(`- \`${name}\``)
    }
  } catch {
    inventory.push('- Could not scan layout components')
  }
  inventory.push('')

  // Scan effects components
  inventory.push('## Effect Components')
  inventory.push('')
  try {
    const effectComponents = await Array.fromAsync(
      new Bun.Glob('*/index.tsx').scan({
        cwd: `${process.cwd()}/components/effects`,
      })
    )
    for (const comp of effectComponents.sort()) {
      const name = comp.replace('/index.tsx', '')
      inventory.push(`- \`${name}\``)
    }
  } catch {
    inventory.push('- Could not scan effect components')
  }
  inventory.push('')

  // Scan pages
  inventory.push('## Pages')
  inventory.push('')
  try {
    const pages = await Array.fromAsync(
      new Bun.Glob('**/page.tsx').scan({
        cwd: `${process.cwd()}/app`,
      })
    )
    for (const page of pages.sort()) {
      const route = page.replace('/page.tsx', '').replace('page.tsx', '/')
      // Skip example pages
      if (!route.includes('(examples)')) {
        inventory.push(`- \`/${route}\``)
      }
    }
  } catch {
    inventory.push('- Could not scan pages')
  }

  const content = inventory.join('\n')

  if (!dryRun) {
    await Bun.write(`${process.cwd()}/INVENTORY.md`, content)
  }

  return content
}

/**
 * Generate deployment checklist
 */
const generateChecklist = async (
  projectName: string,
  dryRun: boolean
): Promise<string> => {
  const integrations = getConfiguredIntegrations()

  const checklist: string[] = []

  checklist.push(`# ${projectName} - Deployment Checklist`)
  checklist.push('')
  checklist.push(`Generated: ${new Date().toISOString().split('T')[0]}`)
  checklist.push('')

  checklist.push('## Pre-Deployment')
  checklist.push('')
  checklist.push(
    '- [ ] All environment variables configured in hosting platform'
  )
  checklist.push('- [ ] Custom domain configured')
  checklist.push('- [ ] SSL certificate active')
  checklist.push('- [ ] Build passes without errors (`bun run build`)')
  checklist.push('- [ ] TypeScript passes without errors (`bun typecheck`)')
  checklist.push('')

  if (integrations.includes('Sanity')) {
    checklist.push('## Sanity CMS')
    checklist.push('')
    checklist.push('- [ ] Production dataset selected')
    checklist.push('- [ ] CORS origins configured for production domain')
    checklist.push('- [ ] Webhook configured for revalidation')
    checklist.push('  - URL: `https://your-domain.com/api/revalidate`')
    checklist.push('- [ ] API tokens rotated for production')
    checklist.push('')
  }

  if (integrations.includes('Shopify')) {
    checklist.push('## Shopify')
    checklist.push('')
    checklist.push('- [ ] Storefront API access token configured')
    checklist.push('- [ ] Webhooks configured for product/collection updates')
    checklist.push('- [ ] Test checkout flow in production')
    checklist.push('')
  }

  if (integrations.includes('HubSpot')) {
    checklist.push('## HubSpot')
    checklist.push('')
    checklist.push('- [ ] API access token configured')
    checklist.push('- [ ] Form IDs updated for production forms')
    checklist.push('- [ ] Test form submissions')
    checklist.push('')
  }

  checklist.push('## Performance')
  checklist.push('')
  checklist.push('- [ ] Lighthouse score > 90 for Performance')
  checklist.push('- [ ] Lighthouse score > 90 for Accessibility')
  checklist.push('- [ ] Images optimized and using next/image')
  checklist.push('- [ ] No console errors in production')
  checklist.push('')

  checklist.push('## SEO')
  checklist.push('')
  checklist.push('- [ ] Meta titles and descriptions set for all pages')
  checklist.push('- [ ] Open Graph images configured')
  checklist.push('- [ ] robots.txt configured correctly')
  checklist.push('- [ ] sitemap.xml generating correctly')
  checklist.push('- [ ] Canonical URLs set')
  checklist.push('')

  checklist.push('## Analytics')
  checklist.push('')
  checklist.push('- [ ] Google Analytics or Tag Manager configured')
  checklist.push('- [ ] Cookie consent implemented (if required)')
  checklist.push('- [ ] Privacy policy page exists')
  checklist.push('')

  checklist.push('## Post-Deployment')
  checklist.push('')
  checklist.push('- [ ] Verify all pages load correctly')
  checklist.push('- [ ] Test all forms and interactions')
  checklist.push('- [ ] Verify analytics receiving data')
  checklist.push('- [ ] Test on mobile devices')
  checklist.push('- [ ] Test in different browsers')
  checklist.push('')

  const content = checklist.join('\n')

  if (!dryRun) {
    await Bun.write(`${process.cwd()}/DEPLOYMENT-CHECKLIST.md`, content)
  }

  return content
}

/**
 * Main handoff function
 */
const runHandoff = async (options: HandoffOptions): Promise<void> => {
  const {
    dryRun,
    projectName,
    removeExamples,
    removeDevTools,
    swapReadme: doSwapReadme,
  } = options

  const s = p.spinner()

  // Remove examples
  if (removeExamples) {
    s.start('Removing example pages...')
    const removed = await removeDir('app/(examples)', dryRun)
    s.stop(removed ? 'Removed example pages' : 'No example pages to remove')
  }

  // Remove dev tools
  if (removeDevTools) {
    s.start('Removing development tools...')
    const removedDev = await removeDir('lib/dev', dryRun)
    const removedTheatre = await removeDir('public/config', dryRun)
    s.stop(
      removedDev || removedTheatre
        ? 'Removed development tools'
        : 'No dev tools to remove'
    )
  }

  // Swap README
  if (doSwapReadme) {
    s.start('Swapping README...')
    const swapped = await swapReadme(projectName, dryRun)
    s.stop(
      swapped ? 'README swapped with production version' : 'README swap skipped'
    )
  }

  // Generate inventory
  s.start('Generating component inventory...')
  await generateInventory(dryRun)
  s.stop('Component inventory generated')

  // Generate checklist
  s.start('Generating deployment checklist...')
  await generateChecklist(projectName, dryRun)
  s.stop('Deployment checklist generated')
}

/**
 * CLI entry point
 */
const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-d')

  console.clear()

  p.intro('Satūs Client Handoff')

  if (dryRun) {
    p.log.warn('Dry run mode - no files will be modified')
  }

  // Get project name
  const projectName = await p.text({
    message: 'What is the project name?',
    placeholder: 'My Project',
    validate: (value) => {
      if (!value) return 'Project name is required'
      return undefined
    },
  })

  if (p.isCancel(projectName)) {
    p.cancel('Handoff cancelled')
    process.exit(0)
  }

  // Ask what to do
  const actions = await p.multiselect({
    message: 'What would you like to do?',
    options: [
      {
        value: 'removeExamples',
        label: 'Remove example pages',
        hint: 'Removes app/(examples)/ directory',
      },
      {
        value: 'removeDevTools',
        label: 'Remove dev tools',
        hint: 'Removes Orchestra/Theatre.js (lib/dev/)',
      },
      {
        value: 'swapReadme',
        label: 'Swap README',
        hint: 'Replace README.md with production version',
      },
      {
        value: 'generateInventory',
        label: 'Generate inventory',
        hint: 'Create component and page inventory',
      },
      {
        value: 'generateChecklist',
        label: 'Generate checklist',
        hint: 'Create deployment checklist',
      },
    ],
    initialValues: [
      'removeExamples',
      'swapReadme',
      'generateInventory',
      'generateChecklist',
    ],
  })

  if (p.isCancel(actions)) {
    p.cancel('Handoff cancelled')
    process.exit(0)
  }

  // Show summary
  p.log.step('Summary:')
  p.log.message(`  Project: ${projectName}`)
  p.log.message(`  Actions: ${(actions as string[]).join(', ')}`)

  // Confirm
  const proceed = await p.confirm({
    message: dryRun ? 'Preview changes?' : 'Proceed with handoff preparation?',
  })

  if (p.isCancel(proceed) || !proceed) {
    p.cancel('Handoff cancelled')
    process.exit(0)
  }

  // Run handoff
  const actionsArray = actions as string[]
  await runHandoff({
    dryRun,
    projectName: projectName as string,
    removeExamples: actionsArray.includes('removeExamples'),
    removeDevTools: actionsArray.includes('removeDevTools'),
    swapReadme: actionsArray.includes('swapReadme'),
  })

  // Done
  if (dryRun) {
    p.outro('Dry run complete. Run without --dry-run to apply changes.')
  } else {
    p.note(
      'Generated files:\n' +
        '  - INVENTORY.md (component list)\n' +
        '  - DEPLOYMENT-CHECKLIST.md (launch tasks)\n' +
        '  - README.original.md (backup)\n\n' +
        'Next steps:\n' +
        '  1. Review generated files\n' +
        '  2. Update README with project-specific info\n' +
        '  3. Complete the deployment checklist\n' +
        '  4. Push to client repository',
      'Handoff complete!'
    )
    p.outro('Ready for client delivery!')
  }
}

// Run
main().catch((err) => {
  p.log.error(`Handoff failed: ${err.message}`)
  process.exit(1)
})
