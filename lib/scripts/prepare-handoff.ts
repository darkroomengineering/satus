#!/usr/bin/env bun
/**
 * Client handoff: removes Satūs branding, renames package.json, trims unused
 * env vars, swaps in PROD-README, and generates the component inventory and
 * deployment checklist. `--force` overwrites an existing README.original.md
 * backup; `--help` shows usage.
 */

import * as p from '@clack/prompts'

import {
  type IntegrationId,
  isConfigured,
  integrations as registryIntegrations,
} from '@/integrations/registry'

import type { AstOperation } from './ast-operation-types'
import { applyOpsToText } from './ast-transforms'
import { isInstalled } from './bundle-installer'
import { getIntegrationEntries } from './integration-bundles'
import { guardedPrompt } from './prompts'
import {
  type IntegrationStatus,
  renderDeploymentChecklist,
} from './templates/deployment-checklist'
import { renderInventory } from './templates/inventory'
import { parseCliFlags, pathExists, removeFile, resolvePath } from './utils'

const today = (): string => new Date().toISOString().split('T')[0] ?? ''

// Widened to ReadonlySet<string> so the guard can probe with any string.
const REGISTRY_IDS: ReadonlySet<string> = new Set(
  Object.keys(registryIntegrations)
)
const isRegistryId = (id: string): id is IntegrationId => REGISTRY_IDS.has(id)

/**
 * Which integrations actually ship on disk: presence on disk, not configured
 * env.
 *
 * Bundle-backed integrations are reported only when `isInstalled` finds their
 * code, so one stripped by `setup:project` never appears even if its env vars
 * are still set in the shell. Registry-only integrations with no removable
 * bundle (turnstile, analytics) always ship, so they are always reported.
 *
 * Env validity is a reported axis (`configured`), not a filter, so INVENTORY.md,
 * DEPLOYMENT-CHECKLIST.md, and the `.env.example` cleanup don't omit setup
 * steps for code that ships.
 */
const getShippedIntegrations = async (): Promise<IntegrationStatus[]> => {
  const results: IntegrationStatus[] = []
  const bundleIds = new Set<string>()

  for (const [id, bundle] of getIntegrationEntries()) {
    bundleIds.add(id)
    if (!(await isInstalled(bundle))) continue
    results.push({
      name: bundle.name,
      configured: isRegistryId(id) ? isConfigured(id) : true,
    })
  }

  // SAFETY: Object.keys() widens to `string[]` by design (TS can't rule out
  // extra runtime keys); registryIntegrations is a fully-typed const literal
  // keyed exactly by IntegrationId, so its own keys carry no such risk.
  for (const id of Object.keys(registryIntegrations) as IntegrationId[]) {
    if (bundleIds.has(id)) continue // already reported above via its bundle
    results.push({
      name: registryIntegrations[id].name,
      configured: isConfigured(id),
    })
  }

  return results
}

/**
 * Sorted component names from a directory's `*\/index.tsx` entries, or `null`
 * if it cannot be scanned (the caller renders a fallback line).
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

/** Sorted page routes under `app/` excluding `(examples)`, or `null` if the scan fails. */
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
  /** Overwrite an existing README.original.md backup instead of keeping it. */
  force: boolean
}

interface HandoffResult {
  /**
   * True only when `swapReadme` wrote a fresh `README.original.md` this run,
   * not merely when the swap was selected: a re-run that keeps an existing
   * backup (no `--force`) or lacks `PROD-README.md` must not claim one.
   */
  readmeBackupWritten: boolean
}

/** AST ops that drop the Darkroom credit link from the footer, and its Logo import. */
const FOOTER_LOGO_OPS: AstOperation[] = [
  { kind: 'removeImport', specifier: '@/components/ui/darkroom.svg' },
  {
    kind: 'removeJsxElement',
    tagName: 'Link',
    attribute: { name: 'aria-label', value: 'Darkroom Engineering' },
  },
]

/**
 * Remove the Darkroom credit logo/link from the footer. `removeBrandingAssets`
 * deletes `components/ui/darkroom.svg`, and the footer is its only importer, so
 * leaving the import breaks `bun run build`. Idempotent.
 */
const removeFooterLogo = async (dryRun: boolean): Promise<boolean> => {
  try {
    const footerPath = resolvePath('components/layout/footer/index.tsx')
    if (!(await pathExists(footerPath))) return false

    const original = await Bun.file(footerPath).text()
    const afterOps = applyOpsToText(original, FOOTER_LOGO_OPS)
    if (afterOps === original) return false // already cleaned — no-op

    // JSX removal leaves a whitespace-only line; collapse it to stay `oxfmt`-clean.
    const transformed = afterOps.replace(/\n[ \t]+\n/g, '\n')

    if (!dryRun) {
      await Bun.write(footerPath, transformed)
    }
    return true
  } catch (error) {
    p.log.error(`Failed to remove branding from footer: ${error}`)
    return false
  }
}

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

  if (await removeFooterLogo(dryRun)) {
    removedCount++
  }

  return removedCount > 0
}

const setPackageJsonNameAndDescription = async (
  projectName: string,
  dryRun: boolean
): Promise<boolean> => {
  try {
    const pkgPath = resolvePath('package.json')
    const pkg = await Bun.file(pkgPath).json()

    const slug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const updates = {
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

/** Clean up unused environment variables from .env.example. Exported for unit testing. */
export const cleanupEnvVars = async (dryRun: boolean): Promise<boolean> => {
  try {
    const envExamplePath = resolvePath('.env.example')

    if (!(await pathExists(envExamplePath))) {
      return false
    }

    const content = await Bun.file(envExamplePath).text()

    // Keep env vars of an INSTALLED integration (presence on disk). Stripping
    // them would delete the stub the client needs to fill in; env validity in
    // the current shell is not a signal for whether a stub should survive.
    const keepVars = new Set<string>()
    for (const [, bundle] of getIntegrationEntries()) {
      if (!(await isInstalled(bundle))) continue
      for (const envVar of bundle.envVars) keepVars.add(envVar)
    }

    // Core variables unrelated to any single integration are always kept.
    // Regexes match the var name with any leading `NEXT_PUBLIC_` stripped
    // (mirrors env-drift.test.ts's `ownsKey()`), so Turnstile's client-exposed
    // NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY survives with its server-only
    // sibling.
    const alwaysKeep = [
      /^BASE_URL$/,
      /^GOOGLE_/,
      /^FACEBOOK_/,
      /^CLOUDFLARE_/,
      /^SOURCE_MAPS$/,
    ]

    const lines = content.split('\n')
    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return true
      const varName = trimmed.split('=')[0] ?? ''
      const bareVarName = varName.startsWith('NEXT_PUBLIC_')
        ? varName.slice('NEXT_PUBLIC_'.length)
        : varName
      return (
        keepVars.has(varName) || alwaysKeep.some((re) => re.test(bareVarName))
      )
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

/** Outcome of `swapReadme`, distinguishing "swap happened" from "backup written". */
interface SwapReadmeResult {
  swapped: boolean
  /** False on dry runs, a skipped swap, or an existing backup kept without `--force`. */
  backupWritten: boolean
}

const swapReadme = async (
  projectName: string,
  dryRun: boolean,
  force: boolean
): Promise<SwapReadmeResult> => {
  try {
    const prodReadmePath = resolvePath('PROD-README.md')
    const readmePath = resolvePath('README.md')

    if (!(await pathExists(prodReadmePath))) {
      p.log.warn('PROD-README.md not found, skipping README swap')
      return { swapped: false, backupWritten: false }
    }

    let content = await Bun.file(prodReadmePath).text()

    content = content.replace(/\[PROJECT NAME\]/g, projectName)
    content = content.replace(/\[your-domain\.com\]/g, 'your-domain.com')

    let backupWritten = false

    if (!dryRun) {
      // Never clobber an existing backup without --force: a second handoff run
      // would overwrite the only copy of the pre-swap README.
      const backupPath = resolvePath('README.original.md')
      if (!force && (await pathExists(backupPath))) {
        p.log.warn(
          'README.original.md already exists — keeping the existing backup (pass --force to overwrite)'
        )
      } else {
        const originalReadme = await Bun.file(readmePath).text()
        await Bun.write(backupPath, originalReadme)
        backupWritten = true
      }

      await Bun.write(readmePath, content)

      await removeFile('PROD-README.md')
    }

    return { swapped: true, backupWritten }
  } catch (error) {
    p.log.error(`Failed to swap README: ${error}`)
    return { swapped: false, backupWritten: false }
  }
}

const generateInventory = async (dryRun: boolean): Promise<string> => {
  const content = renderInventory({
    date: today(),
    integrations: await getShippedIntegrations(),
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

const generateChecklist = async (
  projectName: string,
  dryRun: boolean
): Promise<string> => {
  const content = renderDeploymentChecklist({
    projectName,
    integrations: await getShippedIntegrations(),
    date: today(),
  })

  if (!dryRun) {
    await Bun.write(resolvePath('DEPLOYMENT-CHECKLIST.md'), content)
  }

  return content
}

const runHandoff = async (options: HandoffOptions): Promise<HandoffResult> => {
  const {
    dryRun,
    projectName,
    swapReadme: doSwapReadme,
    removeBranding: doRemoveBranding,
    updatePackageJson: doUpdatePackageJson,
    cleanupEnvVars: doCleanupEnvVars,
    generateInventory: doGenerateInventory,
    generateChecklist: doGenerateChecklist,
    force,
  } = options

  const s = p.spinner()

  if (doRemoveBranding) {
    s.start('Removing Satūs branding...')
    const removed = await removeBrandingAssets(dryRun)
    s.stop(removed ? 'Removed branding assets' : 'No branding assets to remove')
  }

  if (doUpdatePackageJson) {
    s.start('Updating package.json...')
    const updated = await setPackageJsonNameAndDescription(projectName, dryRun)
    s.stop(updated ? 'Updated package.json' : 'No package.json changes needed')
  }

  if (doCleanupEnvVars) {
    s.start('Cleaning up environment variables...')
    const cleaned = await cleanupEnvVars(dryRun)
    s.stop(
      cleaned ? 'Cleaned up environment variables' : 'No env vars to clean'
    )
  }

  let readmeBackupWritten = false
  if (doSwapReadme) {
    s.start('Swapping README...')
    const { swapped, backupWritten } = await swapReadme(
      projectName,
      dryRun,
      force
    )
    readmeBackupWritten = backupWritten
    s.stop(
      swapped ? 'README swapped with production version' : 'README swap skipped'
    )
  }

  if (doGenerateInventory) {
    s.start('Generating component inventory...')
    await generateInventory(dryRun)
    s.stop('Component inventory generated')
  }

  if (doGenerateChecklist) {
    s.start('Generating deployment checklist...')
    await generateChecklist(projectName, dryRun)
    s.stop('Deployment checklist generated')
  }

  return { readmeBackupWritten }
}

const HELP_TEXT = `Satūs Client Handoff

Prepares the codebase for delivery to clients: removes Satūs branding,
updates package.json, cleans up unused environment variables, swaps the
README, and generates the component inventory and deployment checklist.

Usage:
  bun run handoff [options]

Options:
  --dry-run     Preview changes without writing any files
  --force       Overwrite an existing README.original.md backup
  --help, -h    Show this help message and exit
`

const main = async (): Promise<void> => {
  const { dryRun, help } = parseCliFlags()
  const force = process.argv.slice(2).includes('--force')

  // --help must short-circuit before anything interactive starts.
  if (help) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  console.clear()

  p.intro('Satūs Client Handoff')

  if (dryRun) {
    p.log.warn('Dry run mode - no files will be modified')
  }

  const projectNameValue = await guardedPrompt(
    () =>
      p.text({
        message: 'What is the project name?',
        placeholder: 'My Project',
        validate: (value) => {
          if (!value) return 'Project name is required'
          return undefined
        },
      }),
    'Handoff cancelled'
  )

  const actionsValue = await guardedPrompt(
    () =>
      p.multiselect({
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
      }),
    'Handoff cancelled'
  )

  p.log.step('Summary:')
  p.log.message(`  Project: ${projectNameValue}`)
  p.log.message(`  Actions: ${actionsValue.join(', ')}`)

  // guardedPrompt exits 1 on cancel or stdin EOF; a deliberate "No" is
  // intentional: exit 0.
  const proceed = await guardedPrompt(
    () =>
      p.confirm({
        message: dryRun
          ? 'Preview changes?'
          : 'Proceed with handoff preparation?',
      }),
    'Handoff cancelled'
  )

  if (!proceed) {
    p.cancel('Handoff cancelled')
    process.exit(0)
  }

  const handoffResult = await runHandoff({
    dryRun,
    projectName: projectNameValue,
    swapReadme: actionsValue.includes('swapReadme'),
    removeBranding: actionsValue.includes('removeBranding'),
    updatePackageJson: actionsValue.includes('updatePackageJson'),
    cleanupEnvVars: actionsValue.includes('cleanupEnvVars'),
    generateInventory: actionsValue.includes('generateInventory'),
    generateChecklist: actionsValue.includes('generateChecklist'),
    force,
  })

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
    // Gated on the actual outcome, not the selected action.
    if (handoffResult.readmeBackupWritten) {
      generated.push('  - README.original.md (backup, gitignored)')
    }
    p.note(
      `${
        generated.length ? `Generated files:\n${generated.join('\n')}\n\n` : ''
      }Next steps:\n` +
        `  1. Review generated files\n` +
        `  2. Update README with project-specific info\n` +
        `  3. Complete the deployment checklist\n` +
        `  4. Push to client repository`,
      'Handoff complete!'
    )
    p.outro('Ready for client delivery!')
  }
}

// Only when executed directly: importing this file for `cleanupEnvVars` etc.
// must not launch the interactive CLI.
if (import.meta.main) {
  main().catch((err) => {
    p.log.error(`Handoff failed: ${err.message}`)
    process.exit(1)
  })
}
