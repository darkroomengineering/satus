#!/usr/bin/env bun
/**
 * Client Handoff Preparation Script
 *
 * Prepares the codebase for delivery to clients by:
 * - Removing example pages
 * - Swapping README with production version
 * - Generating component inventory
 * - Creating deployment checklist
 *
 * Usage:
 *   bun run handoff
 *   bun run handoff --dry-run
 *
 * Cross-platform compatible (Windows, macOS, Linux)
 */

import * as p from '@clack/prompts'
import { getConfiguredIntegrations } from '@/integrations/check-integration'
import {
  parseCliFlags,
  pathExists,
  removeDir,
  removeFile,
  resolvePath,
} from './utils'

interface HandoffOptions {
  dryRun: boolean
  projectName: string
  removeExamples: boolean
  swapReadme: boolean
  removeBranding: boolean
  updatePackageJson: boolean
  cleanupEnvVars: boolean
}

/**
 * Remove Satūs-specific branding and assets (cross-platform)
 */
const removeBrandingAssets = async (dryRun: boolean): Promise<boolean> => {
  const brandingFiles = [
    'components/ui/darkroom.svg',
    'public/opengraph-image.jpg',
    'public/twitter-image.jpg',
    'app/opengraph-image.jpg',
    'app/twitter-image.jpg',
    'app/apple-icon.png',
    'app/icon.png',
  ]

  let removedCount = 0

  for (const file of brandingFiles) {
    if (await removeFile(file, dryRun)) {
      removedCount++
    }
  }

  return removedCount > 0
}

/**
 * Update package.json with project-specific information
 */
const updatePackageJson = async (
  projectName: string,
  dryRun: boolean
): Promise<boolean> => {
  try {
    const pkgPath = resolvePath('package.json')
    const pkg = await Bun.file(pkgPath).json()

    // Generate a slug from project name
    const slug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Update package.json fields
    const updates: Record<string, string> = {
      name: slug,
      description: `${projectName} - Built with Next.js`,
    }

    let hasChanges = false
    for (const [key, value] of Object.entries(updates)) {
      if (pkg[key] !== value) {
        pkg[key] = value
        hasChanges = true
      }
    }

    if (hasChanges && !dryRun) {
      await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
    }

    return hasChanges
  } catch (error) {
    p.log.error(`Failed to update package.json: ${error}`)
    return false
  }
}

/**
 * Clean up unused environment variables from .env.example
 */
const cleanupEnvVars = async (dryRun: boolean): Promise<boolean> => {
  try {
    const envExamplePath = resolvePath('.env.example')

    if (!(await pathExists(envExamplePath))) {
      return false
    }

    const configuredIntegrations = getConfiguredIntegrations()
    const content = await Bun.file(envExamplePath).text()

    // Keep only variables for configured integrations
    const keepPatterns: Record<string, RegExp[]> = {
      Sanity: [/^NEXT_PUBLIC_SANITY_/, /^SANITY_/],
      Shopify: [/^SHOPIFY_/],
      HubSpot: [/^HUBSPOT_/, /^NEXT_PUBLIC_HUBSPOT_/],
      Mailchimp: [/^MAILCHIMP_/],
      Mandrill: [/^MANDRILL_/],
    }

    // Always keep these core variables
    const alwaysKeep = [
      /^NEXT_PUBLIC_BASE_URL$/,
      /^NEXT_PUBLIC_GOOGLE_/,
      /^NEXT_PUBLIC_FACEBOOK_/,
      /^CLOUDFLARE_/,
      /^SOURCE_MAPS$/,
    ]

    const lines = content.split('\n')
    const filteredLines: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        filteredLines.push(line)
        continue
      }

      // Check if this variable should be kept
      let shouldKeep = false
      const varName = trimmed.split('=')[0] ?? ''

      // Always keep core variables
      for (const pattern of alwaysKeep) {
        if (pattern.test(varName)) {
          shouldKeep = true
          break
        }
      }

      if (!shouldKeep) {
        // Check integration-specific variables
        for (const integration of configuredIntegrations) {
          const patterns = keepPatterns[integration]
          if (patterns) {
            for (const pattern of patterns) {
              if (pattern.test(varName)) {
                shouldKeep = true
                break
              }
            }
            if (shouldKeep) break
          }
        }
      }

      if (shouldKeep) {
        filteredLines.push(line)
      }
    }

    const newContent = filteredLines.join('\n')

    if (newContent !== content && !dryRun) {
      await Bun.write(envExamplePath, newContent)
    }

    return newContent !== content
  } catch (error) {
    p.log.error(`Failed to cleanup environment variables: ${error}`)
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
    const prodReadmePath = resolvePath('PROD-README.md')
    const readmePath = resolvePath('README.md')

    if (!(await pathExists(prodReadmePath))) {
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
      await Bun.write(resolvePath('README.original.md'), originalReadme)

      // Write new README
      await Bun.write(readmePath, content)

      // Remove PROD-README (cross-platform)
      await removeFile('PROD-README.md')
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
        cwd: resolvePath('components/ui'),
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
        cwd: resolvePath('components/layout'),
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
        cwd: resolvePath('components/effects'),
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
        cwd: resolvePath('app'),
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
    await Bun.write(resolvePath('INVENTORY.md'), content)
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
    await Bun.write(resolvePath('DEPLOYMENT-CHECKLIST.md'), content)
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
    swapReadme: doSwapReadme,
    removeBranding: doRemoveBranding,
    updatePackageJson: doUpdatePackageJson,
    cleanupEnvVars: doCleanupEnvVars,
  } = options

  const s = p.spinner()

  // Remove branding
  if (doRemoveBranding) {
    s.start('Removing Satūs branding...')
    const removed = await removeBrandingAssets(dryRun)
    s.stop(removed ? 'Removed branding assets' : 'No branding assets to remove')
  }

  // Update package.json
  if (doUpdatePackageJson) {
    s.start('Updating package.json...')
    const updated = await updatePackageJson(projectName, dryRun)
    s.stop(updated ? 'Updated package.json' : 'No package.json changes needed')
  }

  // Cleanup environment variables
  if (doCleanupEnvVars) {
    s.start('Cleaning up environment variables...')
    const cleaned = await cleanupEnvVars(dryRun)
    s.stop(
      cleaned ? 'Cleaned up environment variables' : 'No env vars to clean'
    )
  }

  // Remove examples
  if (removeExamples) {
    s.start('Removing example pages...')
    const removed = await removeDir('app/(examples)', dryRun)
    s.stop(removed ? 'Removed example pages' : 'No example pages to remove')
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
  const { dryRun } = parseCliFlags()

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
        value: 'removeBranding',
        label: 'Remove Satūs branding',
        hint: 'Remove logos, default images, and Satūs references',
      },
      {
        value: 'updatePackageJson',
        label: 'Update package.json',
        hint: 'Update name and description for the project',
      },
      {
        value: 'cleanupEnvVars',
        label: 'Clean environment variables',
        hint: 'Remove unused integration env vars from .env.example',
      },
      {
        value: 'removeExamples',
        label: 'Remove example pages',
        hint: 'Removes app/(examples)/ directory',
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
      'removeBranding',
      'updatePackageJson',
      'cleanupEnvVars',
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
    swapReadme: actionsArray.includes('swapReadme'),
    removeBranding: actionsArray.includes('removeBranding'),
    updatePackageJson: actionsArray.includes('updatePackageJson'),
    cleanupEnvVars: actionsArray.includes('cleanupEnvVars'),
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
