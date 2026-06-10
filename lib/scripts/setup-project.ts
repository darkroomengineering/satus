#!/usr/bin/env bun
/**
 * Interactive Project Setup Script
 *
 * Run after cloning the template: `bun run setup:project`
 *
 * This script helps you:
 * 1. Choose which integrations to keep
 * 2. Remove unused code and dependencies
 * 3. Clean up configuration files
 *
 * Non-interactive (CI) usage — skips every prompt:
 *   bun run setup:project --preset <key>           Use a preset's integrations
 *   bun run setup:project --keep <id,id,...>       Keep an explicit set ('' = lean)
 *   bun run setup:project --keep '' --clean-homepage --yes
 *
 * `--clean-homepage` replaces the manual landing page (default: keep it);
 * `--yes` is accepted alongside either selection flag; `--skip-install`
 * writes package.json without running `bun install` (offline / tests).
 * A successful run
 * records the current git HEAD sha into package.json as `"satus": { "ref" }`,
 * which `bun run satus add` uses to fetch matching integration payloads.
 *
 * Cross-platform compatible (Windows, macOS, Linux)
 */

import * as p from '@clack/prompts'
import type { RemovableId } from '@/integrations/registry'
import { applyCodeTransforms } from './ast-transforms'
import { cancelGuard } from './generate-shared'
import {
  type CodeTransform,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import {
  getFlagValue,
  parseCliFlags,
  pathExists,
  removeDir,
  removeFile,
  resolvePath,
} from './utils'

/**
 * Preset project modes with pre-selected integrations
 *
 * Naming inspired by the darkroom/studio creative aesthetic
 */
export const PROJECT_PRESETS = {
  editorial: {
    name: 'Editorial',
    description: 'Content-driven site with Sanity CMS and HubSpot forms',
    integrations: ['sanity', 'hubspot', 'mailchimp'],
  },
  studio: {
    name: 'Studio',
    description:
      'Full creative suite with WebGL, CMS, animations, and all integrations',
    integrations: [
      'sanity',
      'shopify',
      'hubspot',
      'mailchimp',
      'webgl',
      'theatre',
    ],
  },
  boutique: {
    name: 'Boutique',
    description: 'Shopify storefront with HubSpot marketing tools',
    integrations: ['shopify', 'hubspot', 'mailchimp'],
  },
  gallery: {
    name: 'Gallery',
    description:
      'Immersive e-commerce experience with 3D product showcases and CMS',
    integrations: [
      'sanity',
      'shopify',
      'hubspot',
      'mailchimp',
      'webgl',
      'theatre',
    ],
  },
  blank: {
    name: 'Blank',
    description: 'Just Next.js, styling system, and essential components',
    integrations: [],
  },
} as const satisfies Record<
  string,
  { name: string; description: string; integrations: readonly RemovableId[] }
>

type PresetKey = keyof typeof PROJECT_PRESETS

interface SetupOptions {
  dryRun: boolean
  keepIntegrations: string[]
  /** Replace the manual landing page with a blank starter homepage. */
  cleanMarketing: boolean
  /** Write package.json but skip running `bun install` (offline / tests). */
  skipInstall: boolean
}

/**
 * Minimal homepage written when the user opts to drop the demo marketing page.
 * Mirrors the reset documented in the header of `app/page.tsx`.
 */
const BLANK_HOMEPAGE = `import { Wrapper } from '@/components/layout/wrapper'

export default function Home() {
  return (
    <Wrapper theme="dark" lenis={{}}>
      <main />
    </Wrapper>
  )
}
`

/**
 * Replace the manual landing page with a blank starter homepage.
 * Rewrites `app/page.tsx` to the minimal blank starter and removes the
 * co-located CSS module so no orphan file remains.
 */
const replaceManualLandingPage = async (dryRun: boolean): Promise<void> => {
  if (dryRun) {
    p.log.message('  Would replace app/page.tsx with a blank starter homepage')
    p.log.message('  Would delete app/page.module.css (if present)')
  } else {
    await Bun.write(resolvePath('app/page.tsx'), BLANK_HOMEPAGE)
    await removeFile('app/page.module.css', dryRun)
  }
}

/**
 * Remove dependency entries from package.json
 */
const removeDepsFromPackageJson = async (
  depsToRemove: string[],
  devDepsToRemove: string[],
  dryRun: boolean
): Promise<{ deps: string[]; devDeps: string[] }> => {
  const pkgPath = resolvePath('package.json')
  const pkg = await Bun.file(pkgPath).json()

  const removedDeps: string[] = []
  const removedDevDeps: string[] = []

  for (const dep of depsToRemove) {
    if (pkg.dependencies?.[dep]) {
      if (!dryRun) {
        delete pkg.dependencies[dep]
      }
      removedDeps.push(dep)
    }
  }

  for (const dep of devDepsToRemove) {
    if (pkg.devDependencies?.[dep]) {
      if (!dryRun) {
        delete pkg.devDependencies[dep]
      }
      removedDevDeps.push(dep)
    }
  }

  if ((removedDeps.length > 0 || removedDevDeps.length > 0) && !dryRun) {
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }

  return { deps: removedDeps, devDeps: removedDevDeps }
}

/**
 * Clean up .env.example
 */
const updateEnvExample = async (
  envVars: string[],
  dryRun: boolean
): Promise<number> => {
  if (envVars.length === 0) return 0

  const envPath = resolvePath('.env.example')

  if (!(await pathExists(envPath))) return 0

  const file = Bun.file(envPath)

  let content = await file.text()
  let changes = 0

  for (const envVar of envVars) {
    const regex = new RegExp(`^${envVar}=.*$\\n?`, 'gm')
    const newContent = content.replace(regex, '')
    if (newContent !== content) {
      content = newContent
      changes++
    }
  }

  if (changes > 0 && !dryRun) {
    await Bun.write(envPath, content)
  }

  return changes
}

/**
 * Update barrel exports to remove references to deleted components
 */
const updateBarrelExports = async (
  barrelExports: Array<{ file: string; pattern: string }>,
  dryRun: boolean
): Promise<number> => {
  let totalChanges = 0

  for (const { file, pattern } of barrelExports) {
    try {
      const fullPath = resolvePath(file)

      if (!(await pathExists(fullPath))) continue

      const barrelFile = Bun.file(fullPath)

      const content = await barrelFile.text()
      const lines = content.split('\n')
      const filteredLines = lines.filter(
        (line) =>
          !(line.includes(`'${pattern}'`) || line.includes(`'./${pattern}'`))
      )

      if (filteredLines.length !== lines.length) {
        if (!dryRun) {
          await Bun.write(fullPath, filteredLines.join('\n'))
        }
        totalChanges++
      }
    } catch (err) {
      p.log.warn(
        `Could not update barrel export in ${file}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return totalChanges
}

/**
 * Main setup function
 */
const setup = async (options: SetupOptions): Promise<void> => {
  const { dryRun, keepIntegrations, cleanMarketing, skipInstall } = options
  const integrationNames = getIntegrationNames()

  // Replace the manual landing page first (independent of integration removal).
  if (cleanMarketing) {
    const ms = p.spinner()
    ms.start('Replacing manual landing page...')
    await replaceManualLandingPage(dryRun)
    ms.stop('Replaced manual landing page with a blank starter homepage')
  }

  // Determine what to remove
  const toRemove = integrationNames.filter(
    (name) => !keepIntegrations.includes(name)
  )

  if (toRemove.length === 0) {
    p.log.success('No integrations to remove. All done!')
    return
  }

  const s = p.spinner()

  // Collect all code transforms first
  const allCodeTransforms: CodeTransform[] = []
  for (const name of toRemove) {
    const bundle = INTEGRATION_BUNDLES[name]
    if (bundle?.codeTransforms) {
      allCodeTransforms.push(...bundle.codeTransforms)
    }
  }

  // Apply code transformations BEFORE removing folders
  if (allCodeTransforms.length > 0) {
    s.start('Applying code transformations...')
    const transformChanges = await applyCodeTransforms(
      allCodeTransforms,
      dryRun
    )
    s.stop(
      transformChanges > 0
        ? `Applied ${transformChanges} code transformations`
        : 'No code transformations needed'
    )
  }

  // Process each integration
  for (const name of toRemove) {
    const bundle = INTEGRATION_BUNDLES[name]
    if (!bundle) continue

    s.start(`Removing ${bundle.name}...`)

    const removed: string[] = []

    // Remove folders
    for (const folder of bundle.folders) {
      if (await removeDir(folder, dryRun)) {
        removed.push(folder)
      }
    }

    // Remove files
    for (const file of bundle.files) {
      if (await removeFile(file, dryRun)) {
        removed.push(file)
      }
    }

    if (removed.length > 0) {
      s.stop(`Removed ${bundle.name} (${removed.length} items)`)
    } else {
      s.stop(`${bundle.name} - nothing to remove`)
    }
  }

  // Collect all deps to remove
  const allDeps: string[] = []
  const allDevDeps: string[] = []
  const allEnvVars: string[] = []
  const allBarrelExports: Array<{ file: string; pattern: string }> = []

  for (const name of toRemove) {
    const bundle = INTEGRATION_BUNDLES[name]
    if (!bundle) continue
    allDeps.push(...bundle.dependencies)
    allDevDeps.push(...bundle.devDependencies)
    allEnvVars.push(...bundle.envVars)
    allBarrelExports.push(...bundle.barrelExports)
  }

  // Update package.json
  if (allDeps.length > 0 || allDevDeps.length > 0) {
    s.start('Updating package.json...')
    const { deps, devDeps } = await removeDepsFromPackageJson(
      allDeps,
      allDevDeps,
      dryRun
    )
    const total = deps.length + devDeps.length
    s.stop(
      total > 0
        ? `Removed ${total} dependencies from package.json`
        : 'No dependencies to remove'
    )
  }

  // Update .env.example
  if (allEnvVars.length > 0) {
    s.start('Updating .env.example...')
    const changes = await updateEnvExample(allEnvVars, dryRun)
    s.stop(
      changes > 0
        ? `Removed ${changes} env vars from .env.example`
        : 'No env changes needed'
    )
  }

  // Update barrel exports
  if (allBarrelExports.length > 0) {
    s.start('Updating component exports...')
    const changes = await updateBarrelExports(allBarrelExports, dryRun)
    s.stop(
      changes > 0
        ? `Updated ${changes} barrel export files`
        : 'No export updates needed'
    )
  }

  // Run bun install to update lockfile
  if (!(dryRun || skipInstall)) {
    s.start('Updating lockfile...')
    await Bun.$`bun install`.quiet()
    s.stop('Dependencies updated')
  }
}

/**
 * Record the current git HEAD sha into package.json as the pinned satus ref
 * (`"satus": { "ref": … }`), used by `satus add` to fetch matching payloads.
 * Skips silently when git is unavailable — the ref is optional metadata.
 */
const recordPinnedRef = async (): Promise<void> => {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
      stdout: 'pipe',
      stderr: 'ignore',
    })
    const exitCode = await proc.exited
    if (exitCode !== 0) return

    const sha = (await new Response(proc.stdout).text()).trim()
    if (!sha) return

    const pkgPath = resolvePath('package.json')
    const pkg = (await Bun.file(pkgPath).json()) as {
      satus?: Record<string, unknown>
      [key: string]: unknown
    }
    pkg.satus = { ...(pkg.satus ?? {}), ref: sha }
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  } catch {
    // git not installed / not a repo — the pinned ref is optional metadata
  }
}

/**
 * Resolve the integrations to keep from the non-interactive flags.
 * Returns undefined when neither --preset nor --keep was passed.
 * Fails loudly on conflicting flags and unknown preset / integration ids.
 */
export const resolveKeepFromFlags = (
  presetFlag: string | undefined,
  keepFlag: string | undefined
): RemovableId[] | undefined => {
  if (presetFlag !== undefined && keepFlag !== undefined) {
    throw new Error('Use either --preset or --keep, not both')
  }

  if (presetFlag !== undefined) {
    if (!(presetFlag in PROJECT_PRESETS)) {
      throw new Error(
        `Unknown preset "${presetFlag}". Available: ${Object.keys(PROJECT_PRESETS).join(', ')}`
      )
    }
    return [...PROJECT_PRESETS[presetFlag as PresetKey].integrations]
  }

  if (keepFlag !== undefined) {
    const ids = keepFlag
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    const known = getIntegrationNames()
    for (const id of ids) {
      if (!(known as string[]).includes(id)) {
        throw new Error(
          `Unknown integration "${id}". Available: ${known.join(', ')}`
        )
      }
    }
    return ids as RemovableId[]
  }

  return undefined
}

/** Interactive integration selection (preset select or custom multiselect). */
const promptForIntegrations = async (): Promise<RemovableId[]> => {
  // Build preset options
  const presetOptions = [
    ...Object.entries(PROJECT_PRESETS).map(([key, preset]) => ({
      value: key,
      label: preset.name,
      hint: preset.description,
    })),
    {
      value: 'custom',
      label: 'Custom',
      hint: 'Choose individual integrations manually',
    },
  ]

  // Ask what kind of project to start
  const selectedPreset = await p.select({
    message: 'What kind of project are you building?',
    options: presetOptions,
  })

  // Handle cancellation
  if (p.isCancel(selectedPreset)) {
    p.cancel('Setup cancelled')
    process.exit(0)
  }

  if (selectedPreset === 'custom') {
    // Build options for multiselect
    const integrationOptions = getIntegrationNames().map((key) => ({
      value: key,
      label: INTEGRATION_BUNDLES[key]?.name ?? key,
      hint: INTEGRATION_BUNDLES[key]?.description ?? '',
    }))

    // Ask which integrations to keep
    const customIntegrations = await p.multiselect({
      message:
        'Which integrations do you want to KEEP? (space to select, enter to confirm)',
      options: integrationOptions,
      required: false,
    })

    return cancelGuard(customIntegrations, 'Setup cancelled')
  }

  // Use preset integrations
  const preset = PROJECT_PRESETS[selectedPreset as PresetKey]
  const keepIntegrations = [...preset.integrations]

  p.log.step(`Selected preset: ${preset.name}`)
  p.log.message(
    `  Includes: ${keepIntegrations.length > 0 ? keepIntegrations.map((k) => INTEGRATION_BUNDLES[k]?.name).join(', ') : 'None'}`
  )

  return keepIntegrations
}

/**
 * CLI entry point
 */
const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  const { dryRun } = parseCliFlags(argv)
  const presetFlag = getFlagValue(argv, '--preset')
  const keepFlag = getFlagValue(argv, '--keep')
  const yes = argv.includes('--yes')
  const cleanHomepageFlag = argv.includes('--clean-homepage')
  const skipInstall = argv.includes('--skip-install')

  // Throws on conflicting / unknown values — fails loudly before any prompt.
  const flagKeep = resolveKeepFromFlags(presetFlag, keepFlag)
  const nonInteractive = flagKeep !== undefined

  if (yes && !nonInteractive) {
    throw new Error(
      '--yes requires --preset <key> or --keep <id,id,...> to define the integration set'
    )
  }

  if (!nonInteractive) {
    console.clear()
  }

  p.intro('Satūs Project Setup')

  if (dryRun) {
    p.log.warn('Dry run mode - no files will be modified')
  }

  let keepIntegrations: RemovableId[]
  let cleanMarketing: boolean

  if (flagKeep !== undefined) {
    keepIntegrations = flagKeep
    // Default behavior preserved: the landing page is only replaced when
    // --clean-homepage is passed explicitly.
    cleanMarketing = cleanHomepageFlag
  } else {
    keepIntegrations = await promptForIntegrations()

    // Offer to drop the manual landing page for a clean slate.
    const cleanMarketingAnswer = await p.confirm({
      message: 'Replace the manual landing page with a blank starter homepage?',
      initialValue: false,
    })

    if (p.isCancel(cleanMarketingAnswer)) {
      p.cancel('Setup cancelled')
      process.exit(0)
    }

    cleanMarketing = cleanMarketingAnswer
  }

  const toRemove = getIntegrationNames().filter(
    (name) => !keepIntegrations.includes(name)
  )

  if (toRemove.length === 0 && !cleanMarketing) {
    p.log.success('Keeping all integrations. No changes needed!')
    p.outro('Run: bun dev')
    return
  }

  // Show summary
  p.log.step('Summary:')

  if (keepIntegrations.length > 0) {
    p.log.message(
      `  Keep: ${keepIntegrations.map((k) => INTEGRATION_BUNDLES[k]?.name).join(', ')}`
    )
  }

  if (toRemove.length > 0) {
    p.log.message(
      `  Remove: ${toRemove.map((k) => INTEGRATION_BUNDLES[k]?.name).join(', ')}`
    )
  }

  if (cleanMarketing) {
    p.log.message(
      '  Homepage: replace manual landing page with a blank starter'
    )
  }

  // Confirm — skipped in non-interactive mode (--preset / --keep imply --yes)
  if (!nonInteractive) {
    const proceed = await p.confirm({
      message: dryRun ? 'Preview changes?' : 'Proceed with setup?',
    })

    if (p.isCancel(proceed) || !proceed) {
      p.cancel('Setup cancelled')
      process.exit(0)
    }
  }

  // Run setup
  await setup({
    dryRun,
    keepIntegrations: keepIntegrations as string[],
    cleanMarketing,
    skipInstall,
  })

  // Pin the payload ref for `satus add` (skipped silently without git)
  if (!dryRun) {
    await recordPinnedRef()
  }

  // Done
  if (dryRun) {
    p.outro('Dry run complete. Run without --dry-run to apply changes.')
  } else {
    p.note(
      'Next steps:\n' +
        '  1. Review the changes\n' +
        '  2. Update README.md with your project info\n' +
        '  3. Copy .env.example to .env.local\n' +
        '  4. Run: bun dev',
      'Setup complete!'
    )
    p.outro('Happy coding! 🚀')
  }
}

// Run only when executed directly (not when imported by tests or other modules)
if (import.meta.main) {
  main().catch((err) => {
    p.log.error(`Setup failed: ${err.message}`)
    process.exit(1)
  })
}
