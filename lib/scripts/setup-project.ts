#!/usr/bin/env bun
/**
 * Interactive Project Setup Script
 *
 * Run after cloning the template: `bun run setup:project`
 *
 * This script helps you:
 * 1. Choose which integrations to keep — the set is expanded to include every
 *    transitive `requires` dependency (e.g. keeping theatre also keeps webgl)
 * 2. Strip to lean core (removes ALL integrations unconditionally)
 * 3. Re-add the kept integrations additively (copy files, restore
 *    dependencies, barrel exports, env stubs, and code transforms)
 * 4. Self-prune its own setup machinery from the scaffolded project
 *
 * Non-interactive (CI) usage — skips the integration-selection prompt:
 *   bun run setup:project --preset <key>           Use a preset's integrations
 *   bun run setup:project --keep <id,id,...>       Keep an explicit set ('' = lean)
 *   bun run setup:project --keep '' --clean-homepage --yes
 *
 * `--clean-homepage` replaces the manual landing page (default: keep it);
 * `--skip-install` writes package.json without running `bun install`
 * (offline / tests).
 *
 * `--yes` skips the final proceed/confirm prompt. Without it, `--preset`/
 * `--keep` still skip the confirm prompt when stdio isn't a TTY (so scripted
 * / CI invocations — including create-darkroom's — never hang), but show it
 * when run at an interactive terminal, giving a human a chance to abort.
 *
 * Cross-platform compatible (Windows, macOS, Linux)
 */

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
import { cancelGuard } from './generate-shared'
import {
  type CodeTransform,
  getBundle,
  getIntegrationNames,
  INTEGRATION_BUNDLES,
} from './integration-bundles'
import type { PayloadPackageJson, PayloadSource } from './payload-source'
import {
  getFlagValue,
  parseCliFlags,
  pathExists,
  projectRoot,
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
// Preflight (H8): validate before any mutation begins
// ---------------------------------------------------------------------------

/**
 * Collect the relative paths (folders / files / overwriteFiles) declared by
 * the kept bundles' manifests — the exact set `setupSnapshot` needs present
 * on disk to build a working payload. Exported for unit testing.
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
 * Check which of `paths` are absent on disk. `exists` is injectable so tests
 * can simulate a missing path without touching the filesystem; it defaults
 * to a real `pathExists(resolvePath(...))` check.
 *
 * This is the preflight for H8: `setupSnapshot` silently skips any bundle
 * path that doesn't exist (`if (await pathExists(src))`), while the later
 * `installBundle` call throws hard on the resulting incomplete snapshot —
 * by which point folder removal, self-prune, and the package.json write may
 * already have run. Calling this BEFORE any of those steps means a missing
 * path is reported with zero mutations performed, instead of leaving the
 * project half-migrated.
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
    const bundle = getBundle(id)
    if (!bundle) continue // id: RemovableId — guard is honest

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
 * Returns removal counts and any code-transform failures for logging.
 */
const setupLean = async (
  pkg: PackageJson,
  dryRun: boolean
): Promise<{ deps: number; devDeps: number; failures: TransformFailure[] }> => {
  const integrationNames = getIntegrationNames()
  const s = p.spinner()

  // Collect ALL code transforms (all bundles, not just the "unkept" ones)
  const allCodeTransforms: CodeTransform[] = []
  for (const name of integrationNames) {
    // name: BundleId → INTEGRATION_BUNDLES[name] is always IntegrationBundle
    allCodeTransforms.push(...INTEGRATION_BUNDLES[name].codeTransforms)
  }

  // Apply code transformations BEFORE removing folders
  let failures: TransformFailure[] = []
  if (allCodeTransforms.length > 0) {
    s.start('Stripping integrations (code transforms)...')
    const transformResult = await applyCodeTransforms(allCodeTransforms, dryRun)
    failures = transformResult.failures
    s.stop(
      transformResult.changes > 0
        ? `Applied ${transformResult.changes} code transformations`
        : 'No code transformations needed'
    )
  }

  // Remove all integration folders and files
  for (const name of integrationNames) {
    // name: BundleId → access is always total
    const bundle = INTEGRATION_BUNDLES[name]

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
    // name: BundleId → access is always total
    const bundle = INTEGRATION_BUNDLES[name]
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

  return { deps: totalDeps, devDeps: totalDevDeps, failures }
}

/**
 * For each kept integration, run the shared re-add steps via `installBundle`,
 * which centralizes: copyBundleFiles, applyOverwriteFiles, addDependencies
 * (from snapshot package.json), restoreBarrelExports, appendEnvStubs,
 * addTransforms.
 *
 * Also strips absent-integration wiring from freshly copied files (e.g.
 * keeping webgl without theatre must remove theatre hooks from the copied
 * fluid/flowmaps).
 *
 * Returns any code-transform failures collected along the way instead of
 * swallowing them — callers report and fail loudly once the whole batch is
 * done (M6).
 */
const setupAddIntegrations = async (
  keepIntegrations: RemovableId[],
  source: PayloadSource,
  dryRun: boolean
): Promise<{ failures: TransformFailure[] }> => {
  if (keepIntegrations.length === 0) return { failures: [] }

  const s = p.spinner()

  // Read the snapshot's package.json for dependency version pins
  const payloadPkgText = await Bun.file(
    join(source.root, 'package.json')
  ).text()
  const payloadPkg = JSON.parse(payloadPkgText) as PayloadPackageJson

  // Re-add each kept integration in order (respecting requires transitivity
  // is not needed here — the snapshot already has all files).
  const addedIntegrationIds = new Set<RemovableId>()
  const failures: TransformFailure[] = []

  for (const id of keepIntegrations) {
    const bundle = getBundle(id)
    if (!bundle) continue // id: RemovableId — guard is honest

    s.start(`Re-adding ${bundle.name}...`)

    const { details, failures: bundleFailures } = await installBundle(
      source,
      bundle,
      payloadPkg,
      {
        dryRun,
        force: true, // we just stripped everything — always overwrite
      }
    )
    failures.push(...bundleFailures)

    addedIntegrationIds.add(id)

    const verb = dryRun ? 'Would re-add' : 'Re-added'
    const detail = details.length > 0 ? ` (${details.join(', ')})` : ''
    s.stop(`${verb} ${bundle.name}${detail}`)
  }

  // Strip absent-integration wiring from freshly copied files.
  // e.g. keeping webgl without theatre must remove theatre wiring from the
  // copied fluid/flowmap hooks.  These ops are no-ops on already-lean files.
  const stripResult = await stripAbsentIntegrationWiring(
    addedIntegrationIds,
    dryRun
  )
  failures.push(...stripResult.failures)
  if (stripResult.changes > 0) {
    p.log.step(
      `Stripped absent-integration wiring from ${stripResult.changes} copied files`
    )
  }

  return { failures }
}

// ---------------------------------------------------------------------------
// Cache Components opt-out (no CMS/storefront kept)
// ---------------------------------------------------------------------------

/**
 * Integration ids whose kept presence justifies keeping Cache Components on
 * — a CMS (sanity) or storefront (shopify) is the kind of project that
 * benefits from `'use cache'` route caching. When the FINAL kept set
 * (after `resolveTransitiveKeepSet` expansion) contains neither, the project
 * is a simple site: Cache Components costs ~30ms/dev request and buys
 * nothing, and `cacheComponents: true` hard-breaks AWS/SST deploys.
 *
 * Do not widen this list without re-verifying the empirical probe this relies
 * on: disabling `cacheComponents` is only safe because pruning sanity ALSO
 * removes the `/sanity` route's `'use cache'` directive — that directive is a
 * hard compile error once `cacheComponents` is off. A kept CMS/storefront
 * integration could reintroduce a `'use cache'` route, so this condition must
 * stay exactly "neither sanity nor shopify kept", never loosened.
 */
const CACHE_COMPONENTS_WORTH_KEEPING: readonly RemovableId[] = [
  'sanity',
  'shopify',
]

/**
 * True when the kept integration set has no CMS/storefront — the condition
 * under which Cache Components should be disabled. Pure and exported for
 * unit testing (mirrors `shouldSkipConfirm`'s pattern).
 */
export const shouldDisableCacheComponents = (
  keepIntegrations: RemovableId[]
): boolean =>
  !keepIntegrations.some((id) => CACHE_COMPONENTS_WORTH_KEEPING.includes(id))

/**
 * next.config.ts transform that flips Cache Components off.
 *
 * Both ops are required together: an empirical `bun run build` probe showed
 * `experimental.cachedNavigations: true` hard-errors Next's config
 * validation when `cacheComponents` is false ("`experimental.cachedNavigations`
 * requires `cacheComponents` to be enabled."). `experimental.prefetchInlining`
 * was probed too and needs no change — Next's config validation accepts it
 * fine with `cacheComponents` off.
 */
export const CACHE_COMPONENTS_DISABLE_TRANSFORM: CodeTransform = {
  file: 'next.config.ts',
  ops: [
    {
      kind: 'setObjectProperty',
      variableName: 'nextConfig',
      propertyPath: 'cacheComponents',
      valueText: 'false',
    },
    {
      kind: 'setObjectProperty',
      variableName: 'nextConfig',
      propertyPath: 'experimental.cachedNavigations',
      valueText: 'false',
    },
  ],
}

/**
 * Anchored doc-sentence replacements so a fork's docs don't claim Cache
 * Components is enabled after setup just disabled it. Each `anchor` is
 * matched as an exact substring; when absent (doc since reworded), the file
 * is skipped with a warning instead of failing the whole setup run over a
 * doc sentence — see `setupCacheComponentsOptOut`.
 */
const CACHE_COMPONENTS_DOC_PATCHES: ReadonlyArray<{
  file: string
  anchor: string
  replacement: string
}> = [
  {
    file: 'AGENTS.md',
    anchor:
      'Cache Components are enabled globally (`cacheComponents: true` in `next.config.ts`).',
    replacement:
      'Cache Components is disabled in this project (no CMS/storefront integration kept at setup). Re-enable `cacheComponents` in next.config.ts when adding one.',
  },
  {
    file: 'ARCHITECTURE.md',
    anchor: 'Server Components use advanced caching. Key rules:',
    replacement:
      'Cache Components is disabled in this project (no CMS/storefront integration kept at setup). Re-enable `cacheComponents` in next.config.ts when adding one.',
  },
]

/**
 * Replace the first exact occurrence of `anchor` in `content` with
 * `replacement`. Returns `changed: false` (content returned byte-for-byte
 * unchanged) when the anchor isn't found. Pure — no I/O — exported for unit
 * testing.
 */
export const replaceAnchoredText = (
  content: string,
  anchor: string,
  replacement: string
): { text: string; changed: boolean } => {
  if (!content.includes(anchor)) return { text: content, changed: false }
  return { text: content.replace(anchor, replacement), changed: true }
}

/**
 * True when `configText` has Cache Components off. Pure — exported for unit
 * testing. Matches any spacing so a hand-edited `cacheComponents:false`
 * counts, keeping re-runs of setup on an already-disabled fork quiet.
 */
export const isCacheComponentsDisabled = (configText: string): boolean =>
  /cacheComponents\s*:\s*false/.test(configText)

/**
 * When the final kept set has no CMS/storefront (`shouldDisableCacheComponents`),
 * flip Cache Components off in next.config.ts and patch the two doc sections
 * that otherwise claim it's enabled (AGENTS.md, ARCHITECTURE.md). No-op
 * (nothing printed, nothing written) when a CMS or storefront is kept.
 *
 * The docs are only rewritten once the flip is verified on disk — a
 * next.config.ts the ops don't recognize (renamed `nextConfig`, restructured
 * config) must not produce docs claiming Cache Components is off while the
 * config still says otherwise. Dry runs skip that verification (nothing was
 * written) and report intent only.
 *
 * A missing doc anchor only warns — it never fails the setup run.
 */
const setupCacheComponentsOptOut = async (
  keepIntegrations: RemovableId[],
  dryRun: boolean
): Promise<{ failures: TransformFailure[] }> => {
  if (!shouldDisableCacheComponents(keepIntegrations)) {
    return { failures: [] }
  }

  const s = p.spinner()
  s.start('Disabling Cache Components (no CMS/storefront kept)...')

  const { failures } = await applyCodeTransforms(
    [CACHE_COMPONENTS_DISABLE_TRANSFORM],
    dryRun
  )

  // Verify the flip landed before rewriting docs to claim it did. A zero
  // change count alone is ambiguous — it also occurs on the (fine) re-run
  // where a previous setup already disabled it — so read the file instead.
  if (!dryRun) {
    const configPath = resolvePath('next.config.ts')
    const configText = (await pathExists(configPath))
      ? await Bun.file(configPath).text()
      : ''
    if (!isCacheComponentsDisabled(configText)) {
      s.stop(
        'Could not disable Cache Components — next.config.ts shape not recognized; docs left as-is'
      )
      failures.push({
        file: 'next.config.ts',
        error:
          'setObjectProperty found no `cacheComponents` property on `nextConfig` to flip — disable it manually (and `experimental.cachedNavigations` with it)',
      })
      return { failures }
    }
  }

  for (const { file, anchor, replacement } of CACHE_COMPONENTS_DOC_PATCHES) {
    try {
      const fullPath = resolvePath(file)
      if (!(await pathExists(fullPath))) continue

      const original = await Bun.file(fullPath).text()
      const { text, changed } = replaceAnchoredText(
        original,
        anchor,
        replacement
      )

      if (!changed) {
        p.log.warn(
          `Could not find the Cache Components sentence to update in ${file} — leaving it as-is.`
        )
        continue
      }

      if (!dryRun) {
        await Bun.write(fullPath, text)
      }
    } catch (error) {
      failures.push({
        file,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  s.stop(
    'Cache Components disabled (no CMS/storefront kept) — re-enable in next.config.ts if this project adds one'
  )

  return { failures }
}

/**
 * Mutate the in-memory package.json object to remove the `setup:project` and
 * `test:setup` script entries, and delete the setup script files from disk.
 * Returns the list of deleted files and removed script keys (for logging).
 * Does NOT write package.json — caller owns the single write.
 *
 * KEPT (used by tests that ship with every project):
 *   - lib/scripts/test-setup.ts (bunfig.toml preloads it for ALL bun tests;
 *     not matched by the `*.test.ts` glob below, so it's inherently safe)
 *
 * KEPT (shared production machinery — used by `generate`, `doctor`, and
 * `prepare-handoff`, which all ship with every project, not just by setup):
 *   - lib/scripts/integration-bundles.ts, bundle-installer.ts,
 *     ast-transforms/, barrel-file.ts, payload-source.ts, generate-shared.ts
 *
 * The setup-machinery test files to delete are discovered via a glob over
 * `lib/scripts/**\/*.test.ts` (L10 — not a hardcoded list, which drifted out
 * of sync whenever a new setup test file was added) minus an explicit KEEP
 * allowlist — see `SELF_PRUNE_KEEP_TEST_FILES` and `collectSelfPruneTestFiles`.
 */

/**
 * Test files the glob-derived self-prune list must NOT delete, because they
 * ship with every scaffolded project rather than being setup-only machinery.
 */
export const SELF_PRUNE_KEEP_TEST_FILES: ReadonlySet<string> = new Set([
  // Tests prepare-handoff's document templates, which ship with every
  // scaffolded project (see the KEPT production-machinery note above) — it
  // must survive self-prune.
  'lib/scripts/templates/templates.test.ts',
])

/**
 * Discover the setup-machinery test files to delete during self-prune: every
 * `lib/scripts/**\/*.test.ts` file on disk, minus `SELF_PRUNE_KEEP_TEST_FILES`.
 * Exported for unit testing.
 */
export const collectSelfPruneTestFiles = async (): Promise<string[]> => {
  const testFiles = await Array.fromAsync(
    new Bun.Glob('lib/scripts/**/*.test.ts').scan({ cwd: projectRoot })
  )
  return testFiles
    .filter((file) => !SELF_PRUNE_KEEP_TEST_FILES.has(file))
    .sort()
}

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
 * Main setup orchestration (additive model):
 *
 *   1. PREFLIGHT — validate every file/folder the kept bundles declare
 *      exists on disk. Exits loudly with zero mutations performed when
 *      anything is missing (H8) — must run before ANY of the mutating
 *      steps below.
 *   2. ensureNextTypeStub
 *   3. cleanMarketing (if flagged)
 *   4. snapshot(kept) — capture kept integration files before stripping
 *   5. Read package.json ONCE into memory
 *   6. setupLean — strip ALL integrations (mutates in-memory pkg)
 *   7. Write package.json (dep removal applied). Must happen BEFORE
 *      setupAddIntegrations so the snapshot re-add sees a consistent lockfile
 *      target; this is NOT the final write — see step 11.
 *   8. setupAddIntegrations — re-add the kept set from the snapshot
 *   9. snapshot.cleanup()
 *  10. setupCacheComponentsOptOut — when the final kept set has neither
 *      sanity nor shopify, flip `cacheComponents` off in next.config.ts and
 *      patch the docs that claim it's enabled. No-op otherwise.
 *  11. selfPrune — delete setup files (including this script) and mutate
 *      pkg.scripts in-memory, THEN a second package.json write to persist
 *      the scripts removal. This is deliberately the LAST mutating step:
 *      running it only after setupAddIntegrations has completed
 *      successfully means any failure in steps 3–8 leaves
 *      lib/scripts/setup-project.ts (and its package.json script entry)
 *      intact, so the run can simply be repeated (H8).
 *  12. bun install (unless --skip-install). Non-fatal on failure (M5): a
 *      registry/offline error is reported and surfaced to the caller via
 *      the returned `installFailed` flag, but does not undo or block the
 *      steps above — the setup itself already succeeded by this point.
 *
 * Returns `installFailed` (bun install failed but setup files are all
 * written) and `transformFailures` (any AST code-transform that failed —
 * collected rather than swallowed, per M6) so the caller can report and
 * exit non-zero without the run appearing to have silently succeeded.
 */
const setup = async (
  options: SetupOptions
): Promise<{
  installFailed: boolean
  transformFailures: TransformFailure[]
}> => {
  const { dryRun, keepIntegrations, cleanMarketing, skipInstall } = options

  // 1. PREFLIGHT: every kept bundle's declared folders/files/overwriteFiles
  //    must exist before any mutation begins. Zero mutations performed here.
  const missingPaths = await findMissingPaths(
    declaredBundlePaths(keepIntegrations)
  )
  if (missingPaths.length > 0) {
    throw new Error(
      `Cannot set up — kept integration(s) reference missing files/folders:\n${missingPaths
        .map((rel) => `  - ${rel}`)
        .join(
          '\n'
        )}\n\nRestore the missing path(s), or edit the bundle manifest in lib/scripts/integration-bundles.ts, then re-run. No files were changed.`
    )
  }

  // 2. Ensure the Next.js type stub is present so `bun run typecheck` works
  //    immediately after setup without needing to run `bun dev` first.
  await ensureNextTypeStub(dryRun)

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

  // 5. Read package.json ONCE into memory. The dep-removal mutator operates
  //    on this object; selfPrune's script removal is applied to the same
  //    object later (step 11) and persisted with its own write, so this
  //    object stays the single source of truth throughout.
  const pkgPath = resolvePath('package.json')
  const pkg = (await Bun.file(pkgPath).json()) as PackageJson

  // 6. Strip ALL integrations unconditionally to lean core.
  //    Mutates `pkg` for dep removal; other file changes (folders, env) happen here.
  const leanResult = await setupLean(pkg, dryRun)

  // 7. Write package.json (dep removal applied). Runs before
  //    setupAddIntegrations so the re-add's dependency pins land on a
  //    consistent base; the scripts removal from selfPrune is persisted by
  //    a second write at step 11, after setupAddIntegrations succeeds.
  if (!dryRun) {
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }

  // 8. Re-add the kept integrations from the snapshot.
  //    The snapshot cleanup is in `finally` so the temp dir is always removed,
  //    even when setupAddIntegrations throws.
  let addFailures: TransformFailure[] = []
  if (snapshot) {
    try {
      const addResult = await setupAddIntegrations(
        keepIntegrations,
        snapshot,
        dryRun
      )
      addFailures = addResult.failures
    } finally {
      // 9. Cleanup snapshot temp directory (always runs — even on failure).
      await snapshot.cleanup()
    }
  }

  // 10. When the final kept set has no CMS/storefront, disable Cache
  //     Components in next.config.ts and patch the docs claiming it's
  //     enabled. No-op otherwise. Runs after the kept set is fully re-added
  //     (so a re-added integration's own transforms aren't clobbered) and
  //     before selfPrune (so a failure here still leaves the setup script
  //     repeatable, per H8).
  const cacheResult = await setupCacheComponentsOptOut(keepIntegrations, dryRun)

  // 11. Self-prune: delete setup files (including this script), mutate
  //     pkg.scripts in-memory, and persist that with a second package.json
  //     write. Deliberately last — see the docstring above.
  await selfPrune(pkg, dryRun)
  if (!dryRun) {
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }

  // 12. Run bun install to update the lockfile. Non-fatal: an offline /
  //     registry failure is reported but does not mask the setup steps
  //     above having already succeeded.
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

  return {
    installFailed,
    transformFailures: [
      ...leanResult.failures,
      ...addFailures,
      ...cacheResult.failures,
    ],
  }
}

/**
 * Confirm-prompt gating contract (H6 — `--yes` was previously a no-op: the
 * proceed confirm was skipped whenever `--preset`/`--keep` was passed, whether
 * or not `--yes` was present).
 *
 *   - `yes` → always skip (the flag becomes meaningful).
 *   - no `hasFlags` (fully interactive, no `--preset`/`--keep`) → never skip
 *     — confirm as today.
 *   - `hasFlags`, no `yes` → skip only when NOT a TTY. This keeps
 *     create-darkroom's cross-repo scaffolding contract working (it invokes
 *     `setup:project --preset <key>` / `--keep <ids>` without `--yes`, with
 *     stdio inherited but often non-TTY) while still giving a human at an
 *     interactive terminal a chance to abort.
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

/**
 * Expand a kept-integration set to include every transitive `requires`
 * dependency (e.g. keeping `theatre` — which requires `webgl` — also keeps
 * `webgl`) — the same closure algorithm the deleted `satus add` CLI used
 * (`resolveAddSet`), ported here because `setup:project` needs the same
 * invariant: for every kept id, everything in `INTEGRATION_BUNDLES[id].requires`
 * is kept too, or the re-add step leaves orphaned files (a kept integration
 * whose required dependency was stripped).
 *
 * Fails loudly on unknown ids and circular `requires` chains. `implied` lists
 * ids pulled in beyond the request, for logging. Exported for unit testing.
 */
export function resolveTransitiveKeepSet(requested: string[]): {
  order: RemovableId[]
  implied: RemovableId[]
} {
  const knownIds = getIntegrationNames()

  const requestedIds: RemovableId[] = requested.map((id) => {
    if (!(knownIds as string[]).includes(id)) {
      throw new Error(
        `Unknown integration "${id}". Available: ${knownIds.join(', ')}`
      )
    }
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
    // key: BundleId → INTEGRATION_BUNDLES[key] is always IntegrationBundle
    const integrationOptions = getIntegrationNames().map((key) => ({
      value: key,
      label: INTEGRATION_BUNDLES[key].name,
      hint: INTEGRATION_BUNDLES[key].description,
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
    // keepIntegrations: RemovableId[] from preset — use getBundle for safe access
    `  Includes: ${keepIntegrations.length > 0 ? keepIntegrations.map((k) => getBundle(k)?.name).join(', ') : 'None'}`
  )

  return keepIntegrations
}

/**
 * Guard against running against the wrong directory (L3): require a
 * package.json in cwd that declares the `setup:project` script this file is
 * invoked through, so a stray `bun run setup:project` outside a fresh satus
 * clone fails loudly before any prompt or mutation.
 */
const guardProjectRoot = async (): Promise<void> => {
  const pkgPath = resolvePath('package.json')
  if (!(await pathExists(pkgPath))) {
    throw new Error(
      `Run this from your project root (package.json not found at ${projectRoot})`
    )
  }
  const pkg = (await Bun.file(pkgPath).json()) as {
    scripts?: Record<string, string>
  }
  if (!pkg.scripts?.['setup:project']) {
    throw new Error(
      `Run this from your project root (package.json at ${projectRoot} does not look like a satus project — missing the "setup:project" script)`
    )
  }
}

/**
 * CLI entry point
 */
const main = async (): Promise<void> => {
  await guardProjectRoot()

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

  // Expand the kept set to include every transitive `requires` dependency
  // (e.g. keeping theatre also keeps webgl) BEFORE strip/re-add runs, so a
  // required dependency is never stripped out from under a kept integration.
  const { order: resolvedKeepIntegrations, implied } =
    resolveTransitiveKeepSet(keepIntegrations)
  if (implied.length > 0) {
    p.log.step(
      `Also keeping required integration${implied.length > 1 ? 's' : ''}: ${implied.join(', ')}`
    )
  }
  keepIntegrations = resolvedKeepIntegrations

  // Show summary
  p.log.step('Summary:')

  const toRemove = getIntegrationNames().filter(
    (name) => !keepIntegrations.includes(name)
  )

  if (keepIntegrations.length > 0) {
    p.log.message(
      // keepIntegrations: RemovableId[] — use getBundle for safe access
      `  Keep: ${keepIntegrations.map((k) => getBundle(k)?.name).join(', ')}`
    )
  } else {
    p.log.message('  Keep: none (lean core only)')
  }

  if (toRemove.length > 0) {
    p.log.message(
      // toRemove: BundleId[] (filtered from getIntegrationNames()) — access is total
      `  Remove: ${toRemove.map((k) => INTEGRATION_BUNDLES[k].name).join(', ')}`
    )
  }

  if (cleanMarketing) {
    p.log.message(
      '  Homepage: replace manual landing page with a blank starter'
    )
  }

  p.log.message('  Setup machinery: self-pruned after setup')

  // Confirm gating (H6) — see `shouldSkipConfirm`'s docstring for the full
  // contract: `--yes` always skips; `--preset`/`--keep` without `--yes` skip
  // only off a TTY (create-darkroom's scripted, non-TTY invocations never
  // hang on a prompt); fully interactive runs (no flags) always confirm.
  const skipConfirm = shouldSkipConfirm({
    yes,
    hasFlags: nonInteractive,
    isTTY: Boolean(process.stdout.isTTY) && Boolean(process.stdin.isTTY),
  })

  if (!skipConfirm) {
    const proceed = await p.confirm({
      message: dryRun ? 'Preview changes?' : 'Proceed with setup?',
    })

    if (p.isCancel(proceed) || !proceed) {
      p.cancel('Setup cancelled')
      process.exit(0)
    }
  }

  // Run setup
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

  // Done
  if (dryRun) {
    p.outro('Dry run complete. Run without --dry-run to apply changes.')
    return
  }

  p.note(
    'Next steps:\n' +
      '  1. Review the changes\n' +
      '  2. Update README.md with your project info\n' +
      '  3. Copy .env.example to .env.local\n' +
      '  4. Run: bun dev',
    'Setup complete!'
  )

  if (transformFailures.length > 0) {
    p.outro('Setup finished with code-transform errors — review above.')
    // Distinct non-zero codes: 3 = code transforms failed (severe, loud),
    // 2 = only bun install failed (files are otherwise ready), 1 = a hard
    // argument/setup error via the top-level catch below.
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

// Run only when executed directly (not when imported by tests or other modules)
if (import.meta.main) {
  main().catch((err) => {
    p.log.error(`Setup failed: ${err.message}`)
    process.exit(1)
  })
}
