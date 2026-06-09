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
import { getConfigured, getConfiguredIds } from '@/integrations/registry'
import { cancelGuard } from './generate-shared'
import { INTEGRATION_BUNDLES } from './integration-bundles'
import { renderDeploymentChecklist } from './templates/deployment-checklist'
import { renderInventory } from './templates/inventory'
import { parseCliFlags, pathExists, removeFile, resolvePath } from './utils'

/** Current date as an ISO `YYYY-MM-DD` string for generated-document headers. */
const today = (): string => new Date().toISOString().split('T')[0] ?? ''

/**
 * Scan a components directory for `*\/index.tsx` entries and return the sorted
 * component names (the leading directory of each match). Returns `null` if the
 * directory cannot be scanned, so the caller can render a fallback line.
 */
const scanComponentDir = async (dir: string): Promise<string[] | null> => {
  try {
    const components = await Array.fromAsync(
      new Bun.Glob('*/index.tsx').scan({ cwd: resolvePath(dir) })
    )
    return components.sort().map((comp) => comp.replace('/index.tsx', ''))
  } catch {
    return null
  }
}

/**
 * Scan `app/` for page routes, excluding the `(examples)` group. Returns the
 * processed, sorted routes, or `null` if the scan fails.
 */
const scanPages = async (): Promise<string[] | null> => {
  try {
    const pages = await Array.fromAsync(
      new Bun.Glob('**/page.tsx').scan({ cwd: resolvePath('app') })
    )
    return pages
      .sort()
      .map((page) => page.replace('/page.tsx', '').replace('page.tsx', '/'))
  } catch {
    return null
  }
}

interface HandoffOptions {
  dryRun: boolean
  projectName: string
  swapReadme: boolean
  removeBranding: boolean
  updatePackageJson: boolean
  cleanupEnvVars: boolean
  generateInventory: boolean
  generateChecklist: boolean
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
 * Update package.json name and description with project-specific information
 */
const setPackageJsonNameAndDescription = async (
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

    const content = await Bun.file(envExamplePath).text()

    // Keep env vars that belong to a configured integration, matched by id
    // directly against the bundle record — no fragile lowercase bridge needed.
    const keepVars = new Set<string>()
    for (const id of getConfiguredIds()) {
      const bundle = INTEGRATION_BUNDLES[id]
      if (bundle) {
        for (const envVar of bundle.envVars) keepVars.add(envVar)
      }
    }

    // Core variables unrelated to any single integration are always kept.
    const alwaysKeep = [
      /^NEXT_PUBLIC_BASE_URL$/,
      /^NEXT_PUBLIC_GOOGLE_/,
      /^NEXT_PUBLIC_FACEBOOK_/,
      /^CLOUDFLARE_/,
      /^SOURCE_MAPS$/,
    ]

    const lines = content.split('\n')
    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim()
      // Preserve blank lines and comments.
      if (!trimmed || trimmed.startsWith('#')) return true
      const varName = trimmed.split('=')[0] ?? ''
      return keepVars.has(varName) || alwaysKeep.some((re) => re.test(varName))
    })

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
 * Generate component inventory.
 *
 * Scans the component and page directories, then renders the markdown via the
 * `inventory` template. The document content lives in
 * `./templates/inventory.ts`.
 */
const generateInventory = async (dryRun: boolean): Promise<string> => {
  const content = renderInventory({
    date: today(),
    integrations: getConfigured(),
    uiComponents: await scanComponentDir('components/ui'),
    layoutComponents: await scanComponentDir('components/layout'),
    effectComponents: await scanComponentDir('components/effects'),
    pages: await scanPages(),
  })

  if (!dryRun) {
    await Bun.write(resolvePath('INVENTORY.md'), content)
  }

  return content
}

/**
 * Generate deployment checklist.
 *
 * Renders the markdown via the `deployment-checklist` template. The document
 * content lives in `./templates/deployment-checklist.ts`.
 */
const generateChecklist = async (
  projectName: string,
  dryRun: boolean
): Promise<string> => {
  const content = renderDeploymentChecklist({
    projectName,
    integrations: getConfigured(),
    date: today(),
  })

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
    swapReadme: doSwapReadme,
    removeBranding: doRemoveBranding,
    updatePackageJson: doUpdatePackageJson,
    cleanupEnvVars: doCleanupEnvVars,
    generateInventory: doGenerateInventory,
    generateChecklist: doGenerateChecklist,
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
    const updated = await setPackageJsonNameAndDescription(projectName, dryRun)
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

  // Swap README
  if (doSwapReadme) {
    s.start('Swapping README...')
    const swapped = await swapReadme(projectName, dryRun)
    s.stop(
      swapped ? 'README swapped with production version' : 'README swap skipped'
    )
  }

  // Generate inventory
  if (doGenerateInventory) {
    s.start('Generating component inventory...')
    await generateInventory(dryRun)
    s.stop('Component inventory generated')
  }

  // Generate checklist
  if (doGenerateChecklist) {
    s.start('Generating deployment checklist...')
    await generateChecklist(projectName, dryRun)
    s.stop('Deployment checklist generated')
  }
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

  const projectNameValue = cancelGuard(projectName, 'Handoff cancelled')

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
      'swapReadme',
      'generateInventory',
      'generateChecklist',
    ],
  })

  const actionsValue = cancelGuard(actions, 'Handoff cancelled')

  // Show summary
  p.log.step('Summary:')
  p.log.message(`  Project: ${projectNameValue}`)
  p.log.message(`  Actions: ${actionsValue.join(', ')}`)

  // Confirm
  const proceed = await p.confirm({
    message: dryRun ? 'Preview changes?' : 'Proceed with handoff preparation?',
  })

  if (p.isCancel(proceed) || !proceed) {
    p.cancel('Handoff cancelled')
    process.exit(0)
  }

  // Run handoff
  await runHandoff({
    dryRun,
    projectName: projectNameValue,
    swapReadme: actionsValue.includes('swapReadme'),
    removeBranding: actionsValue.includes('removeBranding'),
    updatePackageJson: actionsValue.includes('updatePackageJson'),
    cleanupEnvVars: actionsValue.includes('cleanupEnvVars'),
    generateInventory: actionsValue.includes('generateInventory'),
    generateChecklist: actionsValue.includes('generateChecklist'),
  })

  // Done
  if (dryRun) {
    p.outro('Dry run complete. Run without --dry-run to apply changes.')
  } else {
    const generated: string[] = []
    if (actionsValue.includes('generateInventory')) {
      generated.push('  - INVENTORY.md (component list)')
    }
    if (actionsValue.includes('generateChecklist')) {
      generated.push('  - DEPLOYMENT-CHECKLIST.md (launch tasks)')
    }
    if (actionsValue.includes('swapReadme')) {
      generated.push('  - README.original.md (backup, gitignored)')
    }
    p.note(
      (generated.length
        ? `Generated files:\n${generated.join('\n')}\n\n`
        : '') +
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
