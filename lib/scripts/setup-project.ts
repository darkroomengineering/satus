#!/usr/bin/env bun
/**
 * Interactive Project Setup Script
 *
 * Run after cloning the template: `bun run setup:project`
 *
 * This script helps you:
 * 1. Choose which integrations to keep
 * 2. Strip to lean core (removes ALL integrations unconditionally)
 * 3. Re-add the kept integrations additively (same machinery as `satus add`)
 * 4. Self-prune its own setup machinery from the scaffolded project
 *
 * Non-interactive (CI) usage — skips every prompt:
 *   bun run setup:project --preset <key>           Use a preset's integrations
 *   bun run setup:project --keep <id,id,...>       Keep an explicit set ('' = lean)
 *   bun run setup:project --keep '' --clean-homepage --yes
 *
 * `--clean-homepage` replaces the manual landing page (default: keep it);
 * `--yes` is accepted alongside either selection flag; `--skip-install`
 * writes package.json without running `bun install` (offline / tests).
 * A successful run records the current git HEAD sha into package.json as
 * `"satus": { "ref" }`, which `bun run satus add` uses to fetch matching
 * integration payloads.
 *
 * Cross-platform compatible (Windows, macOS, Linux)
 */

import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import type { RemovableId } from '@/integrations/registry'
import { applyCodeTransforms } from './ast-transforms'
import { removeBarrelLines } from './barrel-file'
import {
  addDependencies,
  appendEnvStubs,
  applyOverwriteFiles,
  copyBundleFiles,
  restoreBarrelExports,
  stripAbsentIntegrationWiring,
} from './bundle-installer'
import { cancelGuard } from './generate-shared'
import {
  type CodeTransform,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import type { PayloadPackageJson, PayloadSource } from './payload-source'
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
  keepIntegrations: RemovableId[]
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

// Parsed package.json shape used by the in-memory mutation helpers below.
type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  satus?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Remove dependency entries from the in-memory package.json object.
 * Returns the lists of removed dep/devDep names (for logging).
 * Does NOT read or write the file — caller owns I/O.
 */
const removeDepsFromPackageJson = (
  pkg: PackageJson,
  depsToRemove: string[],
  devDepsToRemove: string[],
  dryRun: boolean
): { deps: string[]; devDeps: string[] } => {
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

      const content = await Bun.file(fullPath).text()
      const { text, changed } = removeBarrelLines(content, pattern)
      if (changed) {
        if (!dryRun) await Bun.write(fullPath, text)
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
 * Write a minimal `.next/types/routes.d.ts` stub so that `tsgo --noEmit` works
 * on a fresh setup without first running `bun dev`/`bun build`.
 *
 * `next-env.d.ts` (auto-generated by Next.js) contains
 * `import "./.next/types/routes.d.ts"` which causes tsgo to report TS2307 when
 * `.next/` has not been created yet. The real file is generated by `next dev`;
 * this empty stub satisfies the import so typecheck passes on a clean install.
 */
const ensureNextTypeStub = async (dryRun: boolean): Promise<void> => {
  const stubPath = resolvePath('.next/types/routes.d.ts')
  if (await pathExists(stubPath)) return
  if (!dryRun) {
    await mkdir(resolvePath('.next/types'), { recursive: true })
    await Bun.write(stubPath, '// stub — replaced by `next dev`\nexport {}\n')
  }
}

// ---------------------------------------------------------------------------
// Phase orchestration helpers (additive model)
// ---------------------------------------------------------------------------

/**
 * Copy all files the kept integrations need into a temp directory, forming a
 * "snapshot" that can serve as a local payload source for the add step.
 *
 * Captures:
 *  - Each kept bundle's `folders` (recursive copy)
 *  - Each kept bundle's `files` and `overwriteFiles` (individual files)
 *  - The project's package.json (for dependency version pins during re-add)
 *
 * Returns a PayloadSource-shaped object with a cleanup() that removes the
 * temp dir.
 */
const setupSnapshot = async (
  keepIntegrations: RemovableId[]
): Promise<PayloadSource> => {
  const root = await mkdtemp(join(tmpdir(), 'satus-snapshot-'))

  for (const id of keepIntegrations) {
    const bundle = INTEGRATION_BUNDLES[id]
    if (!bundle) continue

    // Copy integration folders
    for (const folder of bundle.folders) {
      const src = resolvePath(folder)
      if (await pathExists(src)) {
        await cp(src, join(root, folder), { recursive: true })
      }
    }

    // Copy integration files and overwriteFiles
    const filesToCopy = [...bundle.files, ...(bundle.overwriteFiles ?? [])]
    for (const file of filesToCopy) {
      const src = resolvePath(file)
      if (await pathExists(src)) {
        const dest = join(root, file)
        // Ensure parent directory exists (dirname of join(root, file))
        const segments = file.split('/')
        if (segments.length > 1) {
          const parentRel = segments.slice(0, -1).join('/')
          await mkdir(join(root, parentRel), { recursive: true })
        }
        await cp(src, dest)
      }
    }
  }

  // Capture barrel export files referenced by the kept bundles
  for (const id of keepIntegrations) {
    const bundle = INTEGRATION_BUNDLES[id]
    if (!bundle) continue
    for (const { file } of bundle.barrelExports) {
      const src = resolvePath(file)
      if (await pathExists(src)) {
        const dest = join(root, file)
        const segments = file.split('/')
        if (segments.length > 1) {
          await mkdir(join(root, segments.slice(0, -1).join('/')), {
            recursive: true,
          })
        }
        // Only copy if not already captured (multiple bundles may share a barrel)
        if (!(await pathExists(dest))) {
          await cp(src, dest)
        }
      }
    }
  }

  // Capture package.json for version pins
  const pkgSrc = resolvePath('package.json')
  if (await pathExists(pkgSrc)) {
    await cp(pkgSrc, join(root, 'package.json'))
  }

  return {
    root,
    label: 'local snapshot (pre-strip)',
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

/**
 * Apply the UNION of ALL bundles' removals unconditionally — stripping every
 * integration to leave a lean core.  This is a re-scoping of the prior
 * "remove unkept" logic to "remove all".
 *
 * Accepts a pre-parsed in-memory `pkg` object and calls `removeDepsFromPackageJson`
 * to mutate it directly — no file I/O for the package.json dep removal step.
 * Returns removal counts for logging.
 */
const setupLean = async (
  pkg: PackageJson,
  dryRun: boolean
): Promise<{ deps: number; devDeps: number }> => {
  const integrationNames = getIntegrationNames()
  const s = p.spinner()

  // Collect ALL code transforms (all bundles, not just the "unkept" ones)
  const allCodeTransforms: CodeTransform[] = []
  for (const name of integrationNames) {
    const bundle = INTEGRATION_BUNDLES[name]
    if (bundle?.codeTransforms) {
      allCodeTransforms.push(...bundle.codeTransforms)
    }
  }

  // Apply code transformations BEFORE removing folders
  if (allCodeTransforms.length > 0) {
    s.start('Stripping integrations (code transforms)...')
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

  // Remove all integration folders and files
  for (const name of integrationNames) {
    const bundle = INTEGRATION_BUNDLES[name]
    if (!bundle) continue

    s.start(`Removing ${bundle.name}...`)

    const removed: string[] = []

    for (const folder of bundle.folders) {
      if (await removeDir(folder, dryRun)) {
        removed.push(folder)
      }
    }

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

  // Collect all deps / env vars / barrel exports across ALL bundles
  const allDeps: string[] = []
  const allDevDeps: string[] = []
  const allEnvVars: string[] = []
  const allBarrelExports: Array<{ file: string; pattern: string }> = []

  for (const name of integrationNames) {
    const bundle = INTEGRATION_BUNDLES[name]
    if (!bundle) continue
    allDeps.push(...bundle.dependencies)
    allDevDeps.push(...bundle.devDependencies)
    allEnvVars.push(...bundle.envVars)
    allBarrelExports.push(...bundle.barrelExports)
  }

  // Mutate the in-memory package.json object (no file write here)
  let totalDeps = 0
  let totalDevDeps = 0
  if (allDeps.length > 0 || allDevDeps.length > 0) {
    s.start('Updating package.json (removing deps)...')
    const { deps, devDeps } = removeDepsFromPackageJson(
      pkg,
      allDeps,
      allDevDeps,
      dryRun
    )
    totalDeps = deps.length
    totalDevDeps = devDeps.length
    const total = totalDeps + totalDevDeps
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

  return { deps: totalDeps, devDeps: totalDevDeps }
}

/**
 * For each kept integration, run the same add steps as `satus add` uses —
 * copyBundleFiles, applyOverwriteFiles, addDependencies (from snapshot
 * package.json), restoreBarrelExports, appendEnvStubs, addTransforms —
 * using the snapshot as the payload source.
 *
 * Also strips absent-integration wiring from freshly copied files (e.g.
 * keeping webgl without theatre must remove theatre hooks from the copied
 * fluid/flowmaps — this is the exact same logic `satus add` uses).
 */
const setupAddIntegrations = async (
  keepIntegrations: RemovableId[],
  source: PayloadSource,
  dryRun: boolean
): Promise<void> => {
  if (keepIntegrations.length === 0) return

  const s = p.spinner()

  // Read the snapshot's package.json for dependency version pins
  const payloadPkgText = await Bun.file(
    join(source.root, 'package.json')
  ).text()
  const payloadPkg = JSON.parse(payloadPkgText) as PayloadPackageJson

  // Re-add each kept integration in order (respecting requires transitivity
  // is not needed here — the snapshot already has all files).
  const addedIntegrationIds = new Set<RemovableId>()

  for (const id of keepIntegrations) {
    const bundle = INTEGRATION_BUNDLES[id]
    if (!bundle) continue

    s.start(`Re-adding ${bundle.name}...`)
    const details: string[] = []

    // Copy bundle folders/files from the snapshot
    try {
      const { copied, skipped } = await copyBundleFiles(source, bundle, {
        dryRun,
        force: true, // we just stripped everything — always overwrite
      })
      if (copied > 0) details.push(`${copied} files copied`)
      if (skipped > 0) details.push(`${skipped} files kept`)
    } catch (err) {
      // Some bundles may have no folders/files (hubspot, mailchimp) — that's fine
      p.log.warn(
        `copyBundleFiles for ${bundle.name}: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    // Restore overwriteFiles wholesale
    const overwrite = await applyOverwriteFiles(source, bundle, {
      dryRun,
      force: true,
    })
    if (overwrite.written.length > 0) {
      details.push(
        `${overwrite.written.length} integration-owned files restored`
      )
    }

    // Re-add dependencies from the snapshot package.json
    const deps = await addDependencies(bundle, payloadPkg, { dryRun })
    if (deps.added.length > 0) {
      details.push(`${deps.added.length} dependencies re-added`)
    }

    // Restore barrel exports from the snapshot
    const barrelChanges = await restoreBarrelExports(source, bundle, { dryRun })
    if (barrelChanges > 0) {
      details.push(`${barrelChanges} barrel exports restored`)
    }

    // Append env stubs
    const envChanges = await appendEnvStubs(bundle.envVars, dryRun)
    if (envChanges > 0) details.push(`${envChanges} env stubs appended`)

    // Apply additive code transforms
    const transformChanges = await applyCodeTransforms(
      bundle.addTransforms ?? [],
      dryRun
    )
    if (transformChanges > 0) {
      details.push(`${transformChanges} files re-wired`)
    }

    addedIntegrationIds.add(id)

    const verb = dryRun ? 'Would re-add' : 'Re-added'
    const detail = details.length > 0 ? ` (${details.join(', ')})` : ''
    s.stop(`${verb} ${bundle.name}${detail}`)
  }

  // Strip absent-integration wiring from freshly copied files.
  // e.g. keeping webgl without theatre must remove theatre wiring from the
  // copied fluid/flowmap hooks.  These ops are no-ops on already-lean files.
  const stripped = await stripAbsentIntegrationWiring(
    addedIntegrationIds,
    dryRun
  )
  if (stripped > 0) {
    p.log.step(
      `Stripped absent-integration wiring from ${stripped} copied files`
    )
  }
}

/**
 * Mutate the in-memory package.json object to remove the `setup:project` and
 * `test:setup` script entries, and delete the setup script files from disk.
 * Returns the list of deleted files and removed script keys (for logging).
 * Does NOT write package.json — caller owns the single write.
 *
 * KEPT (used by tests that ship with every project):
 *   - lib/scripts/test-setup.ts (bunfig.toml preloads it for ALL bun tests)
 *
 * KEPT (additive machinery, needed by `satus add` in the scaffolded project):
 *   - lib/scripts/satus.ts and all its deps
 *   - lib/scripts/ast-transforms.ts, integration-bundles.ts, etc.
 */
const selfPrune = async (
  pkg: PackageJson,
  dryRun: boolean
): Promise<{ deleted: string[]; scriptsRemoved: string[] }> => {
  const s = p.spinner()
  s.start('Self-pruning setup machinery...')

  const filesToDelete = [
    'lib/scripts/setup-project.test.ts',
    'lib/scripts/satus.test.ts',
    'lib/scripts/satus.e2e.test.ts',
    'lib/scripts/ast-transforms.test.ts',
    'lib/scripts/payload-source.test.ts',
  ]

  const deleted: string[] = []

  for (const file of filesToDelete) {
    if (dryRun) {
      p.log.message(`  Would delete ${file}`)
      deleted.push(file)
    } else if (await removeFile(file, false)) {
      deleted.push(file)
    }
  }

  // Mutate the in-memory package.json scripts (no file write here)
  const scriptsRemoved: string[] = []
  const scripts = pkg.scripts
  if (scripts) {
    const scriptKeys = ['setup:project', 'test:setup']
    for (const key of scriptKeys) {
      if (key in scripts) {
        scriptsRemoved.push(key)
        if (!dryRun) {
          delete scripts[key]
        }
      }
    }
  }

  if (dryRun) {
    if (scriptsRemoved.length > 0) {
      p.log.message(`  Would remove scripts: ${scriptsRemoved.join(', ')}`)
    }
  }

  s.stop(
    dryRun
      ? `Would prune ${deleted.length} files and ${scriptsRemoved.length} scripts`
      : `Pruned ${deleted.length} files and ${scriptsRemoved.length} package.json scripts`
  )

  // Delete this script itself last (Windows may fail to delete a running script)
  if (!dryRun) {
    try {
      await removeFile('lib/scripts/setup-project.ts', false)
    } catch {
      p.log.warn(
        'Could not delete lib/scripts/setup-project.ts (may need manual removal on Windows)'
      )
    }
  } else {
    p.log.message('  Would delete lib/scripts/setup-project.ts')
  }

  return { deleted, scriptsRemoved }
}

/**
 * Read the current git HEAD sha. Returns the sha string, or undefined when
 * git is unavailable or not a repo. The sha is later written into package.json
 * as `"satus": { "ref": … }` by the consolidated package.json write in setup().
 */
const readGitHead = async (): Promise<string | undefined> => {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
      stdout: 'pipe',
      stderr: 'ignore',
    })
    const exitCode = await proc.exited
    if (exitCode !== 0) return undefined

    const sha = (await new Response(proc.stdout).text()).trim()
    return sha || undefined
  } catch {
    // git not installed / not a repo — the pinned ref is optional metadata
    return undefined
  }
}

/**
 * Main setup orchestration (additive model):
 *
 *   1. ensureNextTypeStub
 *   2. Read git HEAD sha (before any writes — metadata only)
 *   3. cleanMarketing (if flagged)
 *   4. snapshot(kept) — capture kept integration files before stripping
 *   5. Read package.json ONCE into memory
 *   6. setupLean — strip ALL integrations (mutates in-memory pkg)
 *   7. selfPrune — delete setup files; mutate pkg scripts in-memory
 *   8. Apply pinned git ref to in-memory pkg
 *   9. Write package.json ONCE (atomic for steps 6–8; before bun install
 *      so the installer sees the final dep list and lockfile stays consistent)
 *  10. setupAddIntegrations — re-add the kept set from the snapshot
 *  11. snapshot.cleanup()
 *  12. bun install (unless --skip-install); runs after the write so it reads
 *      the already-finalized package.json and only updates the lockfile
 */
const setup = async (options: SetupOptions): Promise<void> => {
  const { dryRun, keepIntegrations, cleanMarketing, skipInstall } = options

  // 1. Ensure the Next.js type stub is present so `bun run typecheck` works
  //    immediately after setup without needing to run `bun dev` first.
  await ensureNextTypeStub(dryRun)

  // 2. Read git HEAD before any writes (pure read, no side-effects).
  const gitSha = dryRun ? undefined : await readGitHead()

  // 3. Replace the manual landing page (independent of integration removal).
  if (cleanMarketing) {
    const ms = p.spinner()
    ms.start('Replacing manual landing page...')
    await replaceManualLandingPage(dryRun)
    ms.stop('Replaced manual landing page with a blank starter homepage')
  }

  // 4. Snapshot the kept integration files before stripping.
  let snapshot: PayloadSource | null = null
  if (keepIntegrations.length > 0) {
    const ss = p.spinner()
    ss.start('Snapshotting kept integration files...')
    snapshot = await setupSnapshot(keepIntegrations)
    ss.stop(`Snapshot ready (${snapshot.label})`)
  }

  // 5. Read package.json ONCE into memory. All three mutators (removeDeps,
  //    selfPrune, recordPinnedRef) operate on this object; a single write
  //    follows at step 9. This avoids partial-mutation on mid-sequence failure
  //    and eliminates 3+ separate read-parse-write round-trips.
  const pkgPath = resolvePath('package.json')
  const pkg = (await Bun.file(pkgPath).json()) as PackageJson

  // 6. Strip ALL integrations unconditionally to lean core.
  //    Mutates `pkg` for dep removal; other file changes (folders, env) happen here.
  await setupLean(pkg, dryRun)

  // 7. Self-prune: delete setup files, mutate pkg.scripts in-memory.
  await selfPrune(pkg, dryRun)

  // 8. Record the pinned satus ref in-memory (git sha read at step 2).
  if (gitSha) {
    pkg.satus = { ...(pkg.satus ?? {}), ref: gitSha }
  }

  // 9. Write package.json ONCE with all three mutations applied.
  //    Must happen BEFORE bun install so the installer sees the final dep list
  //    and updates the lockfile accordingly. bun install does not rewrite
  //    package.json itself, so this write is not clobbered by the install step.
  if (!dryRun) {
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }

  // 10. Re-add the kept integrations from the snapshot.
  if (snapshot) {
    await setupAddIntegrations(keepIntegrations, snapshot, dryRun)
  }

  // 11. Cleanup snapshot temp directory.
  if (snapshot) {
    await snapshot.cleanup()
  }

  // 12. Run bun install to update lockfile.
  if (!(dryRun || skipInstall)) {
    const s = p.spinner()
    s.start('Updating lockfile...')
    await Bun.$`bun install`.quiet()
    s.stop('Dependencies updated')
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

  // Show summary
  p.log.step('Summary:')

  const toRemove = getIntegrationNames().filter(
    (name) => !keepIntegrations.includes(name)
  )

  if (keepIntegrations.length > 0) {
    p.log.message(
      `  Keep: ${keepIntegrations.map((k) => INTEGRATION_BUNDLES[k]?.name).join(', ')}`
    )
  } else {
    p.log.message('  Keep: none (lean core only)')
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

  p.log.message('  Setup machinery: self-pruned after setup')

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
    keepIntegrations,
    cleanMarketing,
    skipInstall,
  })

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
    p.outro('Happy coding!')
  }
}

// Run only when executed directly (not when imported by tests or other modules)
if (import.meta.main) {
  main().catch((err) => {
    p.log.error(`Setup failed: ${err.message}`)
    process.exit(1)
  })
}
