#!/usr/bin/env bun
/**
 * `bun run setup:project`, run after cloning the template:
 * 1. Choose integrations to keep (expanded to every transitive `requires`
 *    dependency, e.g. keeping theatre also keeps webgl)
 * 2. Strip to lean core (removes ALL integrations unconditionally)
 * 3. Re-add the kept integrations additively (files, dependencies, barrel
 *    exports, env stubs, code transforms)
 * 4. Self-prune its own setup machinery
 *
 * Non-interactive flags (see `--help`): `--preset <key>`, `--keep <id,id,...>`
 * (`''` = lean), `--clean-homepage`, `--skip-install`, `--yes`. `--yes` skips
 * the final confirm; without it `--preset`/`--keep` still skip the confirm when
 * stdio isn't a TTY (so create-darkroom's scripted runs never hang) but show it
 * at an interactive terminal.
 */

import { rmSync } from 'node:fs'
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as p from '@clack/prompts'

import type { RemovableId } from '@/integrations/registry'

import {
  applyCodeTransforms,
  type TransformFailure,
} from './ast-transforms/index'
import { removeBarrelLines } from './barrel-file'
import { installBundle, stripAbsentIntegrationWiring } from './bundle-installer'
import {
  type CodeTransform,
  getBundle,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import type { PayloadPackageJson, PayloadSource } from './payload-source'
import { guardedPrompt } from './prompts'
import {
  getFlagValue,
  PENDING_FORMAT_MARKER,
  type PendingFormatMarker,
  parseCliFlags,
  pathExists,
  projectRoot,
  removeDir,
  removeFile,
  resolvePath,
} from './utils'

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

/** Mirrors the reset documented in the header of `app/(site)/page.tsx`. */
const BLANK_HOMEPAGE = `import { Wrapper } from '@/components/layout/wrapper'

export default function Home() {
  return (
    <Wrapper theme="dark" lenis={{}}>
      <main />
    </Wrapper>
  )
}
`

const replaceManualLandingPage = async (dryRun: boolean): Promise<void> => {
  if (dryRun) {
    p.log.message(
      '  Would replace app/(site)/page.tsx with a blank starter homepage'
    )
    p.log.message('  Would delete app/(site)/page.module.css (if present)')
  } else {
    await Bun.write(resolvePath('app/(site)/page.tsx'), BLANK_HOMEPAGE)
    await removeFile('app/(site)/page.module.css', dryRun)
  }
}

/**
 * Delete `app/(site)/(examples)` regardless of which integrations are kept:
 * its routes (`/sanity`, a Sanity wiring tutorial; `/webgl`, the
 * WebGL-follows-CSS example) are for this repo's contributors and must never
 * ship to a scaffolded project. It can't live in the sanity bundle's
 * `folders`, which only apply when Sanity is dropped.
 */
const pruneExampleRoutes = async (dryRun: boolean): Promise<void> => {
  if (dryRun) {
    p.log.message('  Would delete app/(site)/(examples)')
    return
  }
  await removeDir('app/(site)/(examples)', dryRun)
}

// Only the fields the helpers below touch are typed; others round-trip untouched.
type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

/** Mutates the in-memory package.json (caller owns I/O); returns the removed names. */
const removeDepsFromPackageJson = (
  pkg: PackageJson,
  depsToRemove: string[],
  devDepsToRemove: string[],
  dryRun: boolean
) => {
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

const removeScriptsFromPackageJson = (
  pkg: PackageJson,
  scriptsToRemove: string[],
  dryRun: boolean
): string[] => {
  const removed: string[] = []
  for (const name of scriptsToRemove) {
    if (pkg.scripts && name in pkg.scripts) {
      if (!dryRun) delete pkg.scripts[name]
      removed.push(name)
    }
  }
  return removed
}

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
 * Remove barrel export lines that reference deleted components. Failures are
 * returned as `TransformFailure`s, not just warned about: a barrel re-exporting
 * a deleted module breaks the build, and `setup()`'s failure gate must see it
 * or it self-prunes over a broken tree. Exported for unit testing.
 */
export const updateBarrelExports = async (
  barrelExports: { file: string; pattern: string }[],
  dryRun: boolean
): Promise<{ changes: number; failures: TransformFailure[] }> => {
  let totalChanges = 0
  const failures: TransformFailure[] = []

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
      failures.push({
        file,
        error: `Could not update barrel export: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return { changes: totalChanges, failures }
}

/**
 * Write empty `.next/types` stubs so `tsc --noEmit` works on a fresh setup
 * before `bun dev`/`bun build`. `next-env.d.ts` imports BOTH
 * `./.next/types/routes.d.ts` and `./.next/types/root-params.d.ts`, and each
 * missing one is its own TS2307. `next typegen` writes the real files.
 */
const ensureNextTypeStub = async (dryRun: boolean): Promise<void> => {
  const stubs = ['routes.d.ts', 'root-params.d.ts']
  const missing: string[] = []
  for (const stub of stubs) {
    if (!(await pathExists(resolvePath(`.next/types/${stub}`)))) {
      missing.push(stub)
    }
  }
  if (missing.length === 0 || dryRun) return

  await mkdir(resolvePath('.next/types'), { recursive: true })
  for (const stub of missing) {
    await Bun.write(
      resolvePath(`.next/types/${stub}`),
      '// stub — replaced by `next typegen`\nexport {}\n'
    )
  }
}

// Post-run cleanup: the AST transforms' output isn't always oxfmt-clean, and
// COMPONENTS.md isn't self-updating, so a real run formats the changed files
// and regenerates it to leave `bun run check` green. Both need a real
// `bun install` first:
//   - oxfmt's `oxfmt.config.ts` imports the `oxfmt` package, which doesn't
//     resolve on a bare `--skip-install` tree even via `bunx`.
//   - generate-manifest.ts resolves TYPE information via ts-morph, so a
//     pre-install node_modules yields a manifest that fails `manifest:check`
//     after the real install (e.g. `ZodEmail` reading as `any` against a
//     stale zod).
// With `--skip-install`, both defer to a `PENDING_FORMAT_MARKER` file that
// `prepare.ts` finishes on the next `bun install`.

/** Run `bun run format` (oxfmt) over exactly the files this run's transforms modified. */
const formatChangedFiles = async (files: string[]): Promise<void> => {
  if (files.length === 0) return

  const s = p.spinner()
  const label = `${files.length} transformed file${files.length > 1 ? 's' : ''}`
  s.start(`Formatting ${label}...`)
  try {
    await Bun.$`bun run format ${files}`.quiet()
    s.stop(`Formatted ${label}`)
  } catch (error) {
    s.stop(`Formatting ${label} failed — run \`bun run format\` manually`)
    p.log.warn(error instanceof Error ? error.message : String(error))
  }
}

const regenerateManifest = async (): Promise<void> => {
  const s = p.spinner()
  s.start('Regenerating COMPONENTS.md...')
  try {
    await Bun.$`bun run generate:manifest`.quiet()
    s.stop('Regenerated COMPONENTS.md')
  } catch (error) {
    s.stop(
      'Regenerating COMPONENTS.md failed — run `bun run generate:manifest` manually'
    )
    p.log.warn(error instanceof Error ? error.message : String(error))
  }
}

/**
 * Persist the unformatted file list for `prepare.ts`. Written on every real
 * --skip-install run, even with an empty `files` list, because the manifest
 * regeneration also needs deferring.
 */
const writePendingFormatMarker = async (files: string[]): Promise<void> => {
  const marker: PendingFormatMarker = { files }
  await Bun.write(
    resolvePath(PENDING_FORMAT_MARKER),
    `${JSON.stringify(marker, null, 2)}\n`
  )
  const formatNote =
    files.length > 0
      ? `${files.length} file${files.length === 1 ? '' : 's'} formatted and `
      : ''
  p.log.step(
    `Deferred to the next \`bun install\`: ${formatNote}COMPONENTS.md regenerated (--skip-install was passed)`
  )
}

/**
 * Relative paths (folders / files / overwriteFiles) the kept bundles declare:
 * the set `setupSnapshot` needs on disk to build a working payload. Exported
 * for unit testing.
 */
export const declaredBundlePaths = (
  keepIntegrations: RemovableId[]
): string[] => {
  const paths: string[] = []

  for (const id of keepIntegrations) {
    const bundle = getBundle(id)
    if (!bundle) continue // id: RemovableId — guard is honest

    paths.push(
      ...bundle.folders,
      ...bundle.files,
      ...(bundle.overwriteFiles ?? [])
    )
  }

  return paths
}

/**
 * Which of `paths` are absent on disk (`exists` is injectable for tests).
 * `setupSnapshot` silently skips missing bundle paths while the later
 * `installBundle` throws on the incomplete snapshot, after folder removal and
 * the package.json write may have run. Calling this BEFORE any mutation
 * reports a missing path with nothing changed instead of leaving the project
 * half-migrated.
 */
export const findMissingPaths = async (
  paths: string[],
  exists: (rel: string) => Promise<boolean> = (rel) =>
    pathExists(resolvePath(rel))
): Promise<string[]> => {
  const missing: string[] = []
  for (const rel of paths) {
    if (!(await exists(rel))) missing.push(rel)
  }
  return missing
}

/**
 * Copy the kept bundles' folders, files, overwriteFiles and barrel files, plus
 * package.json (for version pins), into a temp dir that serves as the local
 * payload source for the re-add step. `cleanup()` removes it.
 */
const setupSnapshot = async (
  keepIntegrations: RemovableId[]
): Promise<PayloadSource> => {
  const root = await mkdtemp(join(tmpdir(), 'satus-snapshot-'))

  for (const id of keepIntegrations) {
    const bundle = getBundle(id)
    if (!bundle) continue // id: RemovableId — guard is honest

    for (const folder of bundle.folders) {
      const src = resolvePath(folder)
      if (await pathExists(src)) {
        await cp(src, join(root, folder), { recursive: true })
      }
    }

    const filesToCopy = [...bundle.files, ...(bundle.overwriteFiles ?? [])]
    for (const file of filesToCopy) {
      const src = resolvePath(file)
      if (await pathExists(src)) {
        const dest = join(root, file)
        const segments = file.split('/')
        if (segments.length > 1) {
          const parentRel = segments.slice(0, -1).join('/')
          await mkdir(join(root, parentRel), { recursive: true })
        }
        await cp(src, dest)
      }
    }
  }

  for (const id of keepIntegrations) {
    const bundle = getBundle(id)
    if (!bundle) continue // id: RemovableId — guard is honest
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
        // Multiple bundles may share a barrel.
        if (!(await pathExists(dest))) {
          await cp(src, dest)
        }
      }
    }
  }

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
 * Apply the UNION of ALL bundles' removals, stripping every integration to
 * lean core. Mutates the in-memory `pkg` (no file I/O for dep removal).
 * Returns removal counts and collected failures.
 */
const setupLean = async (
  pkg: PackageJson,
  dryRun: boolean
): Promise<{
  deps: number
  devDeps: number
  changedFiles: string[]
  failures: TransformFailure[]
}> => {
  const integrationNames = getIntegrationNames()
  const s = p.spinner()

  const allCodeTransforms: CodeTransform[] = []
  for (const name of integrationNames) {
    allCodeTransforms.push(...INTEGRATION_BUNDLES[name].codeTransforms)
  }

  // Transforms run BEFORE folders are removed.
  let failures: TransformFailure[] = []
  let changedFiles: string[] = []
  if (allCodeTransforms.length > 0) {
    s.start('Stripping integrations (code transforms)...')
    const transformResult = await applyCodeTransforms(allCodeTransforms, dryRun)
    failures = transformResult.failures
    changedFiles = transformResult.changedFiles
    s.stop(
      transformResult.changes > 0
        ? `Applied ${transformResult.changes} code transformations`
        : 'No code transformations needed'
    )
  }

  for (const name of integrationNames) {
    const bundle = INTEGRATION_BUNDLES[name]

    s.start(`Removing ${bundle.name}...`)

    const removed: string[] = []

    // A failed removal (permissions, a lock) throws; collect it like a
    // transform failure so the run strips everything else, then exits
    // non-zero with self-prune skipped.
    for (const folder of bundle.folders) {
      try {
        if (await removeDir(folder, dryRun)) {
          removed.push(folder)
        }
      } catch (error) {
        failures.push({
          file: folder,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    for (const file of bundle.files) {
      try {
        if (await removeFile(file, dryRun)) {
          removed.push(file)
        }
      } catch (error) {
        failures.push({
          file,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (removed.length > 0) {
      s.stop(`Removed ${bundle.name} (${removed.length} items)`)
    } else {
      s.stop(`${bundle.name} - nothing to remove`)
    }
  }

  const allDeps: string[] = []
  const allDevDeps: string[] = []
  const allScripts: string[] = []
  const allEnvVars: string[] = []
  const allBarrelExports: { file: string; pattern: string }[] = []

  for (const name of integrationNames) {
    const bundle = INTEGRATION_BUNDLES[name]
    allDeps.push(...bundle.dependencies)
    allDevDeps.push(...bundle.devDependencies)
    allScripts.push(...(bundle.scripts ?? []))
    allEnvVars.push(...bundle.envVars)
    allBarrelExports.push(...bundle.barrelExports)
  }

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

  const removedScripts = removeScriptsFromPackageJson(pkg, allScripts, dryRun)
  if (removedScripts.length > 0) {
    p.log.step(
      `${dryRun ? 'Would remove' : 'Removed'} ${removedScripts.length} integration scripts from package.json (${removedScripts.join(', ')})`
    )
  }

  if (allEnvVars.length > 0) {
    s.start('Updating .env.example...')
    const changes = await updateEnvExample(allEnvVars, dryRun)
    s.stop(
      changes > 0
        ? `Removed ${changes} env vars from .env.example`
        : 'No env changes needed'
    )
  }

  if (allBarrelExports.length > 0) {
    s.start('Updating component exports...')
    const barrelResult = await updateBarrelExports(allBarrelExports, dryRun)
    failures.push(...barrelResult.failures)
    s.stop(
      barrelResult.changes > 0
        ? `Updated ${barrelResult.changes} barrel export files`
        : 'No export updates needed'
    )
  }

  return { deps: totalDeps, devDeps: totalDevDeps, changedFiles, failures }
}

/**
 * Re-add each kept integration via `installBundle`, then strip
 * absent-integration wiring from the freshly copied files (keeping webgl
 * without theatre must remove theatre hooks from the copied fluid/flowmaps).
 * Returns collected failures; callers report and fail loudly after the batch.
 *
 * `installBundle` can also throw a raw `Error` (the snapshot misses a declared
 * path, or a write fails). Each bundle is caught individually: step 6
 * (`setupLean`) already stripped every integration from the live tree, so an
 * uncaught throw would leave every bundle AFTER the failing one un-re-added
 * too. The failure is recorded as a `TransformFailure` with the bundle name as
 * `file`, flowing through `setup()`'s step 10 gate and `main()`'s exit 3.
 *
 * KNOWN LIMITATION: the failing bundle's own files are best-effort (whatever
 * `installBundle` wrote before throwing stays), and a re-run does NOT reliably
 * recover: its preflight (`findMissingPaths`) checks the on-disk tree this run
 * already stripped, so if the bundle never wrote its probe path back, the next
 * run refuses before any mutation. Reliable retry needs a snapshot/restore or
 * resumable-apply mechanism, which would restructure `setup()`'s
 * strip-then-readd shape.
 *
 * Exported for unit testing.
 */
export const setupAddIntegrations = async (
  keepIntegrations: RemovableId[],
  source: PayloadSource,
  dryRun: boolean
): Promise<{ changedFiles: string[]; failures: TransformFailure[] }> => {
  if (keepIntegrations.length === 0) return { changedFiles: [], failures: [] }

  const s = p.spinner()

  const payloadPkgText = await Bun.file(
    join(source.root, 'package.json')
  ).text()
  const payloadPkg: PayloadPackageJson = JSON.parse(payloadPkgText)

  const addedIntegrationIds = new Set<RemovableId>()
  const failures: TransformFailure[] = []
  const changedFiles = new Set<string>()

  for (const id of keepIntegrations) {
    const bundle = getBundle(id)
    if (!bundle) continue // id: RemovableId — guard is honest

    s.start(`Re-adding ${bundle.name}...`)
    // Counted as kept even if the re-add fails below, or
    // stripAbsentIntegrationWiring would treat it as absent and strip its
    // wiring out of other files too.
    addedIntegrationIds.add(id)

    try {
      const {
        details,
        failures: bundleFailures,
        changedFiles: bundleChangedFiles,
      } = await installBundle(source, bundle, payloadPkg, {
        dryRun,
        force: true, // we just stripped everything — always overwrite
      })
      failures.push(...bundleFailures)
      for (const file of bundleChangedFiles) changedFiles.add(file)

      const verb = dryRun ? 'Would re-add' : 'Re-added'
      const detail = details.length > 0 ? ` (${details.join(', ')})` : ''
      s.stop(`${verb} ${bundle.name}${detail}`)
    } catch (error) {
      s.stop(`Failed to re-add ${bundle.name}`)
      failures.push({
        file: bundle.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const stripResult = await stripAbsentIntegrationWiring(
    addedIntegrationIds,
    dryRun
  )
  failures.push(...stripResult.failures)
  for (const file of stripResult.changedFiles) changedFiles.add(file)
  if (stripResult.changes > 0) {
    p.log.step(
      `Stripped absent-integration wiring from ${stripResult.changes} copied files`
    )
  }

  return { changedFiles: [...changedFiles], failures }
}

/**
 * Deduplicated target files that must exist before any mutation: every
 * `codeTransform` of ALL bundles (they run unconditionally in `setupLean`'s
 * strip pass, kept or not) plus the `addTransforms` of KEPT bundles only (they
 * run via `installBundle` in step 8). Exported for unit testing.
 */
export const codeTransformTargetPaths = (
  keepIntegrations: RemovableId[]
): string[] => {
  const paths = new Set<string>()

  for (const bundle of Object.values(INTEGRATION_BUNDLES)) {
    for (const transform of bundle.codeTransforms) {
      paths.add(transform.file)
    }
  }

  for (const id of keepIntegrations) {
    const bundle = getBundle(id)
    if (!bundle) continue // id: RemovableId — guard is honest
    for (const transform of bundle.addTransforms ?? []) {
      paths.add(transform.file)
    }
  }

  return [...paths]
}

/**
 * Self-prune deletes the setup script files and the setup-machinery tests,
 * found by globbing `lib/scripts/**\/*.test.ts` minus
 * `SELF_PRUNE_KEEP_TEST_FILES` (a hardcoded list drifted whenever a setup test
 * was added). KEPT because they ship with every project:
 *   - lib/scripts/test-setup.ts (bunfig.toml preloads it for ALL bun tests;
 *     not matched by the `*.test.ts` glob)
 *   - shared production machinery used by `doctor` and `prepare-handoff`:
 *     integration-bundles.ts, bundle-installer.ts, ast-transforms/,
 *     barrel-file.ts, payload-source.ts, prompts.ts
 */

/**
 * Test files the glob-derived self-prune list must NOT delete because they
 * ship with every scaffolded project.
 *
 * Two tests for shipped machinery are deliberately NOT here, because they
 * assert things a scaffold may change:
 *   - payload-source.test.ts asserts lib/integrations/hubspot files exist in
 *     this repo's checkout, false in any scaffold that dropped HubSpot.
 *   - prerender-manifest.test.ts asserts the starter's homepage is prerendered
 *     as static HTML; a scaffold's homepage may render per request.
 */
export const SELF_PRUNE_KEEP_TEST_FILES: ReadonlySet<string> = new Set([
  // prepare-handoff's document templates.
  'lib/scripts/templates/templates.test.ts',
  // A test belongs here only when everything it touches survives self-prune:
  // no import of setup-project.ts, no assertion about a file an unkept bundle
  // owns. The `handoff` CLI:
  'lib/scripts/prepare-handoff.test.ts',
  // The lib/env.ts <-> integration-bundles.ts env-var parity; both ship intact
  // (setup strips .env.example lines, not schema keys).
  'lib/scripts/env-drift.test.ts',
  // The AST engine, used by `prepare-handoff`'s footer ops; inline fixtures
  // assert nothing about which integrations a project kept.
  'lib/scripts/ast-transforms.test.ts',
])

/** Setup-machinery tests to delete: every `lib/scripts/**\/*.test.ts` minus the keep list. Exported for unit testing. */
export const collectSelfPruneTestFiles = async (): Promise<string[]> => {
  const testFiles = await Array.fromAsync(
    new Bun.Glob('lib/scripts/**/*.test.ts').scan({ cwd: projectRoot })
  )
  return testFiles
    .filter((file) => !SELF_PRUNE_KEEP_TEST_FILES.has(file))
    .sort()
}

/**
 * Replacement for package.json's `setup:project` script once self-prune has
 * deleted `lib/scripts/setup-project.ts`: explains what happened instead of
 * Bun's generic "Script not found", and still exits non-zero.
 */
export const SETUP_PROJECT_PRUNED_STUB =
  "echo 'This project is already set up — setup:project deletes itself after its first run. Run `git log -- lib/scripts/setup-project.ts` (or check out an earlier commit) to find it again.' && exit 1"

const selfPrune = async (
  pkg: PackageJson,
  dryRun: boolean
): Promise<{ deleted: string[]; scriptsRemoved: string[] }> => {
  const s = p.spinner()
  s.start('Self-pruning setup machinery...')

  const filesToDelete = await collectSelfPruneTestFiles()

  const deleted: string[] = []

  for (const file of filesToDelete) {
    if (dryRun) {
      p.log.message(`  Would delete ${file}`)
      deleted.push(file)
    } else if (await removeFile(file, false)) {
      deleted.push(file)
    }
  }

  // test:setup's test file is deleted above, so its entry is removed.
  // setup:project's script file is deleted below, but its entry is REPLACED
  // with SETUP_PROJECT_PRUNED_STUB.
  const scriptsRemoved: string[] = []
  const scripts = pkg.scripts
  if (scripts) {
    if ('test:setup' in scripts) {
      scriptsRemoved.push('test:setup')
      if (!dryRun) delete scripts['test:setup']
    }
    if ('setup:project' in scripts) {
      scriptsRemoved.push('setup:project')
      if (!dryRun) scripts['setup:project'] = SETUP_PROJECT_PRUNED_STUB
    }
  }

  if (dryRun && scriptsRemoved.length > 0) {
    p.log.message(
      `  Would remove test:setup and replace setup:project with a friendly stub`
    )
  }

  s.stop(
    dryRun
      ? `Would prune ${deleted.length} files and ${scriptsRemoved.length} scripts`
      : `Pruned ${deleted.length} files and ${scriptsRemoved.length} package.json scripts`
  )

  // Last: Windows may fail to delete a running script.
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
 * Main setup orchestration (additive model):
 *
 *   1. PREFLIGHT — every file/folder the kept bundles declare, plus every
 *      codeTransform target across ALL bundles, must exist. Throws with zero
 *      mutations otherwise; must run before ANY mutating step.
 *   2. ensureNextTypeStub
 *   3. cleanMarketing (if flagged), then pruneExampleRoutes (unconditional)
 *   4. snapshot(kept) — capture kept integration files before stripping
 *   5. Read package.json ONCE into memory
 *   6. setupLean — strip ALL integrations (mutates in-memory pkg)
 *   7. Write package.json (dep removal applied), BEFORE setupAddIntegrations
 *      so the re-add sees a consistent base. Not the final write (step 10).
 *   8. setupAddIntegrations — re-add the kept set from the snapshot
 *   9. snapshot.cleanup()
 *  10. selfPrune, gated on zero collected failures from steps 6 and 8. Those
 *      steps never throw on a single file's failure; they collect so the batch
 *      can finish. An ungated selfPrune would delete this script before the
 *      caller reports the failures, breaking the "just re-run it" recovery.
 *      With failures, nothing is deleted or touched and main() reports them
 *      and exits non-zero. When it runs, it re-reads package.json from disk:
 *      step 8's `addDependencies` writes pins straight to disk, which the
 *      step-5 `pkg` never sees, so reusing it would silently revert them. Then
 *      it deletes setup files (including this script), mutates the fresh
 *      pkg.scripts, and writes package.json a second time. It is deliberately
 *      the LAST mutating step: any failure in steps 3-9, thrown or collected,
 *      leaves this script and its package.json entry intact so the run can be
 *      repeated.
 *  11. bun install (unless --skip-install). Non-fatal: a registry/offline
 *      error is surfaced via `installFailed` but doesn't undo the setup.
 *  12. formatChangedFiles over exactly the files steps 6/8 modified.
 *  13. regenerateManifest (COMPONENTS.md).
 *      Steps 12-13 are real (non-dry) runs only, deferred under --skip-install.
 *
 * Returns `installFailed` and `transformFailures` so the caller can report and
 * exit non-zero instead of appearing to succeed.
 */
const setup = async (
  options: SetupOptions
): Promise<{
  installFailed: boolean
  transformFailures: TransformFailure[]
}> => {
  const { dryRun, keepIntegrations, cleanMarketing, skipInstall } = options

  // 1. PREFLIGHT: see `codeTransformTargetPaths` for why codeTransform targets
  //    of ALL bundles count. Zero mutations performed here.
  const missingPaths = await findMissingPaths([
    ...new Set([
      ...declaredBundlePaths(keepIntegrations),
      ...codeTransformTargetPaths(keepIntegrations),
    ]),
  ])
  if (missingPaths.length > 0) {
    throw new Error(
      `Cannot set up — kept integration(s) reference missing files/folders:\n${missingPaths
        .map((rel) => `  - ${rel}`)
        .join(
          '\n'
        )}\n\nRestore the missing path(s), or edit the bundle manifest in lib/scripts/integration-bundles.ts, then re-run. No files were changed.`
    )
  }

  await ensureNextTypeStub(dryRun)

  if (cleanMarketing) {
    const ms = p.spinner()
    ms.start('Replacing manual landing page...')
    await replaceManualLandingPage(dryRun)
    ms.stop('Replaced manual landing page with a blank starter homepage')
  }

  const es = p.spinner()
  es.start('Pruning example routes...')
  await pruneExampleRoutes(dryRun)
  es.stop('Pruned app/(site)/(examples)')

  let snapshot: PayloadSource | null = null
  if (keepIntegrations.length > 0) {
    const ss = p.spinner()
    ss.start('Snapshotting kept integration files...')
    snapshot = await setupSnapshot(keepIntegrations)
    ss.stop(`Snapshot ready (${snapshot.label})`)
  }

  const pkgPath = resolvePath('package.json')
  const pkg: PackageJson = await Bun.file(pkgPath).json()

  const leanResult = await setupLean(pkg, dryRun)

  if (!dryRun) {
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }

  let addFailures: TransformFailure[] = []
  let addChangedFiles: string[] = []
  if (snapshot) {
    try {
      const addResult = await setupAddIntegrations(
        keepIntegrations,
        snapshot,
        dryRun
      )
      addFailures = addResult.failures
      addChangedFiles = addResult.changedFiles
    } finally {
      await snapshot.cleanup()
    }
  }

  // 10. Self-prune, gated and re-reading package.json for the reasons in the
  //     docstring above. Every collected-failure source that feeds the returned
  //     `transformFailures` must be counted here (step 6's strip pass collects
  //     per-file failures like step 8), or the gate leaks and a failed strip
  //     still deletes this script.
  const collectedFailureCount = leanResult.failures.length + addFailures.length
  if (collectedFailureCount === 0) {
    const prunePkg: PackageJson = await Bun.file(pkgPath).json()
    await selfPrune(prunePkg, dryRun)
    if (!dryRun) {
      await Bun.write(pkgPath, `${JSON.stringify(prunePkg, null, 2)}\n`)
    }
  } else {
    p.log.warn(
      `Skipping self-prune — ${collectedFailureCount} code-transform failure(s) above. ` +
        'lib/scripts/setup-project.ts was kept so the run can be repeated after fixing the cause.'
    )
  }

  let installFailed = false
  if (!(dryRun || skipInstall)) {
    const s = p.spinner()
    s.start('Updating lockfile...')
    try {
      await Bun.$`bun install`.quiet()
      s.stop('Dependencies updated')
    } catch (error) {
      s.stop('Dependency install failed')
      installFailed = true
      p.log.warn(
        `Dependency install failed (offline?). Your files are ready — run \`bun install\` manually.\n${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // 12-13. Format and regenerate COMPONENTS.md; both need a real install (see
  // the post-run cleanup note above), so --skip-install defers them to
  // `prepare.ts`.
  if (!dryRun) {
    const changedFiles = [
      ...new Set([...leanResult.changedFiles, ...addChangedFiles]),
    ]
    if (skipInstall) {
      await writePendingFormatMarker(changedFiles)
    } else {
      await formatChangedFiles(changedFiles)
      await regenerateManifest()
    }
  }

  return {
    installFailed,
    transformFailures: [...leanResult.failures, ...addFailures],
  }
}

/**
 * Confirm-prompt gating:
 *   - `yes`: always skip.
 *   - no `hasFlags` (fully interactive): never skip.
 *   - `hasFlags` without `yes`: skip only off a TTY. create-darkroom invokes
 *     `--preset`/`--keep` without `--yes` over often-non-TTY stdio, and a human
 *     at a terminal still gets a chance to abort.
 *
 * Pure and exported for unit testing.
 */
export const shouldSkipConfirm = ({
  yes,
  hasFlags,
  isTTY,
}: {
  yes: boolean
  hasFlags: boolean
  isTTY: boolean
}): boolean => {
  if (yes) return true
  if (!hasFlags) return false
  return !isTTY
}

/**
 * Integrations to keep from `--preset`/`--keep`; undefined when neither was
 * passed. Throws on conflicting flags and unknown preset or integration ids.
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
    // SAFETY: the `in` check above confirmed presetFlag is one of
    // PROJECT_PRESETS's own keys; TS's `in` narrowing doesn't propagate that
    // to the key variable itself, only to the object being indexed.
    return [...PROJECT_PRESETS[presetFlag as PresetKey].integrations]
  }

  if (keepFlag !== undefined) {
    const ids = keepFlag
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    const known = getIntegrationNames()
    for (const id of ids) {
      // SAFETY: Array<BundleId>.includes(id: string) needs the array widened
      // to string[] — BundleId's literal-union element type otherwise rejects
      // an arbitrary CLI-supplied string as the search argument.
      if (!(known as string[]).includes(id)) {
        throw new Error(
          `Unknown integration "${id}". Available: ${known.join(', ')}`
        )
      }
    }
    // SAFETY: every id in `ids` just passed the `known.includes(id)` check
    // above, so each one is a real, known integration id.
    return ids as RemovableId[]
  }

  return undefined
}

/**
 * Expand a kept set to every transitive `requires` dependency (keeping
 * `theatre` also keeps `webgl`); otherwise the re-add leaves a kept
 * integration whose dependency was stripped. Throws on unknown ids and
 * circular chains. `implied` lists ids pulled in beyond the request. Exported
 * for unit testing.
 */
export function resolveTransitiveKeepSet(requested: string[]) {
  const knownIds = getIntegrationNames()

  const requestedIds: RemovableId[] = requested.map((id) => {
    // SAFETY: Array<BundleId>.includes(id: string) needs the array widened
    // to string[] — BundleId's literal-union element type otherwise rejects
    // an arbitrary caller-supplied string as the search argument.
    if (!(knownIds as string[]).includes(id)) {
      throw new Error(
        `Unknown integration "${id}". Available: ${knownIds.join(', ')}`
      )
    }
    // SAFETY: the `knownIds.includes(id)` check above just confirmed `id` is
    // a real, known integration id.
    return id as RemovableId
  })

  const order: RemovableId[] = []
  const visiting = new Set<RemovableId>()

  const visit = (id: RemovableId): void => {
    if (order.includes(id)) return
    if (visiting.has(id)) {
      throw new Error(`Circular "requires" chain detected at "${id}"`)
    }
    visiting.add(id)
    for (const dep of getBundle(id)?.requires ?? []) {
      visit(dep)
    }
    visiting.delete(id)
    order.push(id)
  }

  for (const id of requestedIds) {
    visit(id)
  }

  const implied = order.filter((id) => !requestedIds.includes(id))
  return { order, implied }
}

const promptForIntegrations = async (): Promise<RemovableId[]> => {
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

  const selectedPreset = await guardedPrompt(
    () =>
      p.select({
        message: 'What kind of project are you building?',
        options: presetOptions,
      }),
    'Setup cancelled',
    '--preset <key> or --keep <id,id,...>'
  )

  if (selectedPreset === 'custom') {
    const integrationOptions = getIntegrationNames().map((key) => ({
      value: key,
      label: INTEGRATION_BUNDLES[key].name,
      hint: INTEGRATION_BUNDLES[key].description,
    }))

    return guardedPrompt(
      () =>
        p.multiselect({
          message:
            'Which integrations do you want to KEEP? (space to select, enter to confirm)',
          options: integrationOptions,
          required: false,
        }),
      'Setup cancelled',
      '--preset <key> or --keep <id,id,...>'
    )
  }

  // SAFETY: selectedPreset came from `p.select` with `presetOptions`, whose
  // `value`s are exactly PROJECT_PRESETS's own keys plus 'custom' (handled
  // and returned above), so anything reaching here is a real PresetKey.
  const preset = PROJECT_PRESETS[selectedPreset as PresetKey]
  const keepIntegrations = [...preset.integrations]

  p.log.step(`Selected preset: ${preset.name}`)
  p.log.message(
    `  Includes: ${keepIntegrations.length > 0 ? keepIntegrations.map((k) => getBundle(k)?.name).join(', ') : 'None'}`
  )

  return keepIntegrations
}

const LOCK_PATH = resolvePath('.setup-project.lock')
// The pid file is the backstop for stale-lock detection.
const LOCK_PID_FILE = `${LOCK_PATH}/pid`

/** `kill(pid, 0)` probe: ESRCH means dead; EPERM means alive but owned by someone else. */
const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // SAFETY: process.kill throws Node's own errno-carrying Error subclass
    // on failure (ESRCH/EPERM/EINVAL); `catch` only types it `unknown`.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** Synchronous because `process.on('exit')` and the signal handlers can't await. */
const releaseLockSync = (): void => {
  try {
    rmSync(LOCK_PATH, { recursive: true, force: true })
  } catch {
    // A failed cleanup mustn't mask the real exit.
  }
}

/**
 * Prevent two concurrent `setup:project` runs from interleaving into a
 * contradictory hybrid (both exit 0, neither run's result intact). Non-recursive
 * `mkdir` is atomic: a second run fails with EEXIST with no check-then-create
 * race.
 *
 * Stale locks: the lock dir carries a `pid` file. On EEXIST, a dead PID (crash,
 * `kill -9`, anything that outran the handlers) means the lock is removed and
 * re-acquired; a live PID, or an unreadable pid file, throws.
 *
 * Release paths: the `process.on('exit')` handler covers normal completion,
 * `guardedPrompt`/`cancelGuard`'s `process.exit()` on cancel/EOF, and thrown
 * errors. Bun doesn't reliably emit 'exit' for SIGINT/SIGTERM outside an active
 * prompt, so explicit signal handlers release the lock and exit non-zero.
 * SIGKILL is the case only stale-PID detection can catch.
 */
const acquireLock = async (): Promise<void> => {
  try {
    await mkdir(LOCK_PATH)
  } catch (error) {
    // SAFETY: mkdir throws Node's own errno-carrying Error subclass on
    // failure (EEXIST/EACCES/...); `catch` only types it `unknown`.
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }

    let stalePid: number | undefined
    try {
      const pidText = await Bun.file(LOCK_PID_FILE).text()
      const parsed = Number.parseInt(pidText.trim(), 10)
      if (Number.isFinite(parsed)) stalePid = parsed
    } catch {
      // No readable pid file: can't prove the owner is gone, so fall through
      // to the "in progress" error rather than guessing.
    }

    if (stalePid === undefined || isProcessAlive(stalePid)) {
      throw new Error(
        `Another setup:project run appears to be in progress (lock: ${LOCK_PATH}).\n` +
          "If that's not actually the case — e.g. a previous run crashed without cleaning up — delete the lock and retry:\n" +
          `  rm -rf "${LOCK_PATH}"`
      )
    }

    p.log.warn(
      `Removing a stale setup:project lock left behind by pid ${stalePid} (no longer running): ${LOCK_PATH}`
    )
    await rm(LOCK_PATH, { recursive: true, force: true })
    await mkdir(LOCK_PATH)
  }

  await Bun.write(LOCK_PID_FILE, `${process.pid}\n`)

  process.on('exit', releaseLockSync)

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      releaseLockSync()
      process.exit(1)
    })
  }
}

/**
 * Require a package.json in cwd that declares `setup:project`, so a stray run
 * outside a fresh satus clone fails before any prompt or mutation.
 */
const guardProjectRoot = async (): Promise<void> => {
  const pkgPath = resolvePath('package.json')
  if (!(await pathExists(pkgPath))) {
    throw new Error(
      `Run this from your project root (package.json not found at ${projectRoot})`
    )
  }
  const pkg: { scripts?: Record<string, string> } =
    await Bun.file(pkgPath).json()
  if (!pkg.scripts?.['setup:project']) {
    throw new Error(
      `Run this from your project root (package.json at ${projectRoot} does not look like a satus project — missing the "setup:project" script)`
    )
  }
}

/**
 * Every flag `main()` reads, the source of truth for `findUnknownFlags`.
 * Without that guard a typo'd flag (`--presett`) is silently absorbed and falls
 * through to the interactive prompt, which hangs forever on a non-TTY-but-open
 * stdin (CI).
 */
export const KNOWN_SETUP_FLAGS: readonly string[] = [
  '--dry-run',
  '-d',
  '--verbose',
  '-v',
  '--help',
  '-h',
  '--preset',
  '--keep',
  '--yes',
  '--clean-homepage',
  '--skip-install',
]

/**
 * Every `--`-prefixed argv token that isn't a known flag. Flag values are bare
 * tokens and never flagged; short flags are few and fixed, not the typo
 * surface; `--flag=value` is checked by the name before `=`. Exported for unit
 * testing.
 */
export const findUnknownFlags = (
  argv: string[],
  knownFlags: readonly string[] = KNOWN_SETUP_FLAGS
): string[] =>
  argv.filter((arg) => {
    if (!arg.startsWith('--')) return false
    // SAFETY: `arg` is non-empty (it passed startsWith('--')), so split
    // always yields at least one element.
    const name = arg.split('=')[0] as string
    return !knownFlags.includes(name)
  })

const printUsage = (): void => {
  const presetLines = Object.entries(PROJECT_PRESETS)
    .map(([key, preset]) => `    ${key.padEnd(10)} ${preset.description}`)
    .join('\n')

  console.log(`Satūs Project Setup

Strip the template down to the integrations you're keeping, additively
re-add them, and self-prune this setup machinery — see the file header of
lib/scripts/setup-project.ts for the full step-by-step.

Usage:
  bun run setup:project [flags]

Flags:
  --preset <key>       Use a preset's integrations (skips the interactive prompt)
  --keep <id,id,...>   Keep an explicit integration set ('' = lean core only)
  --clean-homepage     Replace the manual landing page with a blank starter
  --yes                Skip the final proceed/confirm prompt
  --skip-install       Write package.json without running \`bun install\`
  --dry-run, -d        Preview changes without writing anything
  --help, -h           Show this help and exit

Presets (--preset <key>):
${presetLines}

Example:
  bun run setup:project --preset editorial --yes
`)
}

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)

  // Checked first, before --help: parseCliFlags/getFlagValue silently absorb
  // unread tokens (see KNOWN_SETUP_FLAGS).
  const unknownFlags = findUnknownFlags(argv)
  if (unknownFlags.length > 0) {
    p.log.error(
      `Unknown flag${unknownFlags.length > 1 ? 's' : ''}: ${unknownFlags.join(', ')}`
    )
    p.log.message(`Valid flags: ${KNOWN_SETUP_FLAGS.join(', ')}`)
    process.exit(1)
  }

  const { dryRun, help } = parseCliFlags(argv)

  // Before guardProjectRoot()/acquireLock() so --help works from any cwd and
  // never touches the lock.
  if (help) {
    printUsage()
    return
  }

  await guardProjectRoot()
  await acquireLock()

  const presetFlag = getFlagValue(argv, '--preset')
  const keepFlag = getFlagValue(argv, '--keep')
  const yes = argv.includes('--yes')
  const cleanHomepageFlag = argv.includes('--clean-homepage')
  const skipInstall = argv.includes('--skip-install')

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
    cleanMarketing = cleanHomepageFlag
  } else {
    keepIntegrations = await promptForIntegrations()

    cleanMarketing = await guardedPrompt(
      () =>
        p.confirm({
          message:
            'Replace the manual landing page with a blank starter homepage?',
          initialValue: false,
        }),
      'Setup cancelled',
      '--preset <key> or --keep <id,id,...>'
    )
  }

  // Must expand BEFORE strip/re-add so a required dependency is never
  // stripped out from under a kept integration.
  const { order: resolvedKeepIntegrations, implied } =
    resolveTransitiveKeepSet(keepIntegrations)
  if (implied.length > 0) {
    p.log.step(
      `Also keeping required integration${implied.length > 1 ? 's' : ''}: ${implied.join(', ')}`
    )
  }
  keepIntegrations = resolvedKeepIntegrations

  p.log.step('Summary:')

  const toRemove = getIntegrationNames().filter(
    (name) => !keepIntegrations.includes(name)
  )

  if (keepIntegrations.length > 0) {
    p.log.message(
      `  Keep: ${keepIntegrations.map((k) => getBundle(k)?.name).join(', ')}`
    )
  } else {
    p.log.message('  Keep: none (lean core only)')
  }

  if (toRemove.length > 0) {
    p.log.message(
      `  Remove: ${toRemove.map((k) => INTEGRATION_BUNDLES[k].name).join(', ')}`
    )
  }

  if (cleanMarketing) {
    p.log.message(
      '  Homepage: replace manual landing page with a blank starter'
    )
  }

  p.log.message('  Setup machinery: self-pruned after setup')

  const skipConfirm = shouldSkipConfirm({
    yes,
    hasFlags: nonInteractive,
    isTTY: Boolean(process.stdout.isTTY) && Boolean(process.stdin.isTTY),
  })

  if (!skipConfirm) {
    // guardedPrompt exits 1 on cancel or stdin EOF; a deliberate "No" is
    // intentional: exit 0.
    const proceed = await guardedPrompt(
      () =>
        p.confirm({
          message: dryRun ? 'Preview changes?' : 'Proceed with setup?',
        }),
      'Setup cancelled',
      '--yes (with --preset/--keep)'
    )

    if (!proceed) {
      p.cancel('Setup cancelled')
      process.exit(0)
    }
  }

  const { installFailed, transformFailures } = await setup({
    dryRun,
    keepIntegrations,
    cleanMarketing,
    skipInstall,
  })

  if (transformFailures.length > 0) {
    p.log.error(`${transformFailures.length} code transform(s) failed:`)
    for (const failure of transformFailures) {
      p.log.error(`  ${failure.file}: ${failure.error}`)
    }
  }

  if (dryRun) {
    p.outro('Dry run complete. Run without --dry-run to apply changes.')
    return
  }

  p.note(
    'Next steps:\n' +
      '  1. Review the changes\n' +
      '  2. Update README.md with your project info\n' +
      '  3. Add env vars with bun dotenvx set KEY "value" (README § Environment variables)\n' +
      '  4. Run: bun dev',
    'Setup complete!'
  )

  if (transformFailures.length > 0) {
    p.outro('Setup finished with code-transform errors — review above.')
    // Exit codes: 3 = code transforms failed, 2 = only bun install failed
    // (files are ready), 1 = hard argument/setup error (top-level catch).
    process.exit(3)
  }

  if (installFailed) {
    p.outro(
      'Setup complete, but dependency install failed — see warning above.'
    )
    process.exit(2)
  }

  p.outro('Happy coding!')
}

if (import.meta.main) {
  main().catch((err) => {
    p.log.error(`Setup failed: ${err.message}`)
    process.exit(1)
  })
}
