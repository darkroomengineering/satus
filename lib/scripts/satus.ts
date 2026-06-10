#!/usr/bin/env bun
/**
 * Satūs Plugin CLI — the additive inverse of `setup:project`.
 *
 * In a lean project (one that ran `bun run setup:project` and stripped
 * integrations), restore an integration by pulling its source payload from
 * the public satus repo and re-wiring shared files via idempotent AST ops:
 *
 *   bun run satus list
 *   bun run satus add <plugin...> [--from path] [--ref ref] [--dry-run]
 *                                 [--force] [--yes] [--skip-install]
 *
 * Payload source priority: `--from <localPath>` (a satus checkout) →
 * `--ref <gitRef>` → the pinned ref in package.json `satus.ref` → `main`
 * (GitHub tarball). Every prompt is skippable via `--yes` (or runs
 * non-interactively outside a TTY), so the CLI is drivable in CI.
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import * as p from '@clack/prompts'
import type { RemovableId } from '@/integrations/registry'
import { applyCodeTransforms, applyOpsToText } from './ast-transforms'
import {
  type CodeTransform,
  getIntegrationEntries,
  INTEGRATION_BUNDLES,
  type IntegrationBundle,
} from './integration-bundles'
import {
  listPayloadFiles,
  type PayloadPackageJson,
  type PayloadSource,
  payloadPathExists,
  readPayloadFile,
  readPayloadPackageJson,
  readPinnedRef,
  resolvePayloadSource,
} from './payload-source'
import { pathExists, resolvePath } from './utils'

// ---------------------------------------------------------------------------
// CLI argument parsing (exported for unit tests)
// ---------------------------------------------------------------------------

export interface AddFlags {
  from?: string
  ref?: string
  dryRun: boolean
  force: boolean
  yes: boolean
  /** Write package.json but skip running `bun install` (offline / tests). */
  skipInstall: boolean
}

/**
 * Parse `satus add` arguments into plugin ids and flags.
 * Fails loudly on unknown flags and on value flags missing their value.
 */
export function parseAddArgs(argv: string[]): {
  plugins: string[]
  flags: AddFlags
} {
  const plugins: string[] = []
  const flags: AddFlags = {
    dryRun: false,
    force: false,
    yes: false,
    skipInstall: false,
  }

  const takeValue = (
    flag: '--from' | '--ref',
    arg: string,
    next: string | undefined
  ): { value: string; consumedNext: boolean } => {
    if (arg.includes('=')) {
      return { value: arg.slice(flag.length + 1), consumedNext: false }
    }
    if (next === undefined || next.startsWith('-')) {
      throw new Error(`${flag} requires a value`)
    }
    return { value: next, consumedNext: true }
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === undefined) continue

    if (arg === '--from' || arg.startsWith('--from=')) {
      const { value, consumedNext } = takeValue('--from', arg, argv[i + 1])
      flags.from = value
      if (consumedNext) i++
    } else if (arg === '--ref' || arg.startsWith('--ref=')) {
      const { value, consumedNext } = takeValue('--ref', arg, argv[i + 1])
      flags.ref = value
      if (consumedNext) i++
    } else if (arg === '--dry-run') {
      flags.dryRun = true
    } else if (arg === '--force') {
      flags.force = true
    } else if (arg === '--yes') {
      flags.yes = true
    } else if (arg === '--skip-install') {
      flags.skipInstall = true
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`)
    } else {
      plugins.push(arg)
    }
  }

  return { plugins, flags }
}

// ---------------------------------------------------------------------------
// Pure plugin-resolution helpers (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Resolve requested plugin ids plus their transitive `requires` into install
 * order (dependencies first). Fails loudly on unknown ids and circular
 * `requires` chains. `implied` lists ids pulled in beyond the request.
 */
export function resolveAddSet(requested: string[]): {
  order: RemovableId[]
  implied: RemovableId[]
} {
  const knownIds = Object.keys(INTEGRATION_BUNDLES) as RemovableId[]

  const requestedIds: RemovableId[] = requested.map((id) => {
    if (!(knownIds as string[]).includes(id)) {
      throw new Error(
        `Unknown plugin "${id}". Available: ${knownIds.join(', ')}`
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
    for (const dep of INTEGRATION_BUNDLES[id]?.requires ?? []) {
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

/** A bundle counts as installed when its first folder (or file) exists. */
export function bundleProbePath(bundle: IntegrationBundle): string | undefined {
  return bundle.folders[0] ?? bundle.files[0]
}

// ---------------------------------------------------------------------------
// Barrel export restoration (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Find the export line in a source barrel matching the removal `pattern`,
 * using the same matching as setup-project's removal (quoted pattern or
 * quoted './pattern' specifier).
 */
export function findBarrelLine(
  sourceText: string,
  pattern: string
): string | undefined {
  return sourceText
    .split('\n')
    .find(
      (line) => line.includes(`'${pattern}'`) || line.includes(`'./${pattern}'`)
    )
}

/**
 * Insert a barrel export line when absent (sorted position among existing
 * `export` lines, best-effort). Returns the text unchanged when an identical
 * line already exists — idempotent.
 */
export function insertBarrelLine(localText: string, line: string): string {
  const newLine = line.trim()
  if (newLine.length === 0) return localText

  const lines = localText.split('\n')
  if (lines.some((existing) => existing.trim() === newLine)) return localText

  const exportIndexes: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('export ')) exportIndexes.push(i)
  }

  if (exportIndexes.length === 0) {
    const base =
      localText.length === 0 || localText.endsWith('\n')
        ? localText
        : `${localText}\n`
    return `${base}${newLine}\n`
  }

  const sortedAfter = exportIndexes.find(
    (i) => (lines[i] ?? '').localeCompare(newLine) > 0
  )
  const lastExport = exportIndexes[exportIndexes.length - 1] ?? 0
  const insertAt = sortedAfter ?? lastExport + 1
  lines.splice(insertAt, 0, newLine)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Install steps
// ---------------------------------------------------------------------------

const isInstalled = async (bundle: IntegrationBundle): Promise<boolean> => {
  const probe = bundleProbePath(bundle)
  if (!probe) return false
  return pathExists(resolvePath(probe))
}

/**
 * Copy the bundle's `folders` and `files` from the payload source into the
 * project. Existing files are kept (unless --force); missing ones are always
 * copied. Fails loudly when the payload lacks a declared folder or file.
 */
const copyBundleFiles = async (
  source: PayloadSource,
  bundle: IntegrationBundle,
  options: { dryRun: boolean; force: boolean }
): Promise<{ copied: number; skipped: number }> => {
  const relFiles: string[] = []

  for (const folder of bundle.folders) {
    relFiles.push(...(await listPayloadFiles(source, folder)))
  }
  for (const file of bundle.files) {
    if (!(await payloadPathExists(source, file))) {
      throw new Error(`Payload source (${source.label}) is missing ${file}`)
    }
    relFiles.push(file)
  }

  let copied = 0
  let skipped = 0

  for (const rel of relFiles) {
    const dest = resolvePath(rel)
    if ((await pathExists(dest)) && !options.force) {
      skipped++
      continue
    }
    if (!options.dryRun) {
      await mkdir(dirname(dest), { recursive: true })
      await Bun.write(dest, Bun.file(join(source.root, rel)))
    }
    copied++
  }

  return { copied, skipped }
}

/**
 * Copy the bundle's integration-owned `overwriteFiles` wholesale from the
 * payload source. A local file is only overwritten when it matches either
 * the payload version (already wired — no-op) or the expected lean state
 * (the payload version with this bundle's removal codeTransforms applied).
 * Anything else means local modifications — skip with a warning unless
 * --force.
 */
const applyOverwriteFiles = async (
  source: PayloadSource,
  bundle: IntegrationBundle,
  options: { dryRun: boolean; force: boolean }
): Promise<{ written: string[]; skipped: string[] }> => {
  const written: string[] = []
  const skipped: string[] = []

  for (const rel of bundle.overwriteFiles ?? []) {
    const payloadText = await readPayloadFile(source, rel)
    const dest = resolvePath(rel)

    if (!(await pathExists(dest))) {
      if (!options.dryRun) {
        await mkdir(dirname(dest), { recursive: true })
        await Bun.write(dest, payloadText)
      }
      written.push(rel)
      continue
    }

    const localText = await Bun.file(dest).text()
    if (localText === payloadText) continue // already wired

    const removalOps =
      bundle.codeTransforms.find((t) => t.file === rel)?.ops ?? []
    const expectedLean = applyOpsToText(payloadText, removalOps)

    if (localText === expectedLean || options.force) {
      if (!options.dryRun) {
        await Bun.write(dest, payloadText)
      }
      written.push(rel)
    } else {
      skipped.push(rel)
    }
  }

  return { written, skipped }
}

const sortRecord = (record: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
  )

/**
 * Add the bundle's dependencies to the local package.json, pinning each to
 * the version declared by the payload source's package.json. Dependencies
 * already present locally keep their existing pin.
 */
const addDependencies = async (
  bundle: IntegrationBundle,
  payloadPkg: PayloadPackageJson,
  options: { dryRun: boolean }
): Promise<{ added: string[]; missing: string[] }> => {
  const pkgPath = resolvePath('package.json')
  const pkg = (await Bun.file(pkgPath).json()) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    [key: string]: unknown
  }

  const added: string[] = []
  const missing: string[] = []

  const addFrom = (
    names: string[],
    target: 'dependencies' | 'devDependencies'
  ): void => {
    for (const name of names) {
      const version =
        payloadPkg.dependencies?.[name] ?? payloadPkg.devDependencies?.[name]
      if (!version) {
        missing.push(name)
        continue
      }
      const record = pkg[target] ?? {}
      pkg[target] = record
      if (record[name]) continue // already present — keep the local pin
      record[name] = version
      added.push(`${name}@${version}`)
    }
  }

  addFrom(bundle.dependencies, 'dependencies')
  addFrom(bundle.devDependencies, 'devDependencies')

  if (added.length > 0 && !options.dryRun) {
    if (pkg.dependencies) pkg.dependencies = sortRecord(pkg.dependencies)
    if (pkg.devDependencies) {
      pkg.devDependencies = sortRecord(pkg.devDependencies)
    }
    await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }

  return { added, missing }
}

/**
 * Restore the bundle's barrel export lines: read each pattern's line from the
 * SOURCE repo's barrel file and insert it into the local barrel when absent
 * (created when missing). Warns when the payload has no matching barrel/line.
 */
const restoreBarrelExports = async (
  source: PayloadSource,
  bundle: IntegrationBundle,
  options: { dryRun: boolean }
): Promise<number> => {
  let changes = 0

  for (const { file, pattern } of bundle.barrelExports) {
    if (!(await payloadPathExists(source, file))) {
      p.log.warn(
        `Payload source has no barrel file ${file} — skipping export restore for "${pattern}"`
      )
      continue
    }

    const sourceText = await readPayloadFile(source, file)
    const line = findBarrelLine(sourceText, pattern)
    if (!line) {
      p.log.warn(
        `No export line matching "${pattern}" in payload ${file} — skipping`
      )
      continue
    }

    const localPath = resolvePath(file)
    const localText = (await pathExists(localPath))
      ? await Bun.file(localPath).text()
      : ''
    const updated = insertBarrelLine(localText, line)

    if (updated !== localText) {
      if (!options.dryRun) {
        await mkdir(dirname(localPath), { recursive: true })
        await Bun.write(localPath, updated)
      }
      changes++
    }
  }

  return changes
}

/** Append missing env vars as commented stubs to .env.example (created when absent). */
const appendEnvStubs = async (
  envVars: string[],
  dryRun: boolean
): Promise<number> => {
  if (envVars.length === 0) return 0

  const envPath = resolvePath('.env.example')
  const exists = await pathExists(envPath)
  const content = exists ? await Bun.file(envPath).text() : ''

  const missing = envVars.filter(
    (envVar) => !new RegExp(`^#?\\s*${envVar}=`, 'm').test(content)
  )
  if (missing.length === 0) return 0

  if (!dryRun) {
    const base =
      content.length === 0 || content.endsWith('\n') ? content : `${content}\n`
    const stubs = missing.map((envVar) => `# ${envVar}=`).join('\n')
    await Bun.write(envPath, `${base}${stubs}\n`)
  }

  return missing.length
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const runList = async (): Promise<void> => {
  p.intro('Satūs Plugins')

  const entries = getIntegrationEntries()
  const idWidth = Math.max(...entries.map(([id]) => id.length))
  const nameWidth = Math.max(...entries.map(([, bundle]) => bundle.name.length))

  for (const [id, bundle] of entries) {
    const status = (await isInstalled(bundle)) ? 'installed' : 'absent'
    const requires = bundle.requires?.length
      ? `  (requires ${bundle.requires.join(', ')})`
      : ''
    p.log.message(
      `${id.padEnd(idWidth + 2)}${bundle.name.padEnd(nameWidth + 2)}${status}${requires}`
    )
  }

  p.outro('Add one with: bun run satus add <plugin>')
}

const runAdd = async (plugins: string[], flags: AddFlags): Promise<void> => {
  p.intro('Satūs Plugin Add')

  if (flags.dryRun) {
    p.log.warn('Dry run mode - no files will be modified')
  }

  const { order, implied } = resolveAddSet(plugins)

  const statuses: {
    id: RemovableId
    bundle: IntegrationBundle
    installed: boolean
  }[] = []
  for (const id of order) {
    const bundle = INTEGRATION_BUNDLES[id]
    if (!bundle) continue // unreachable — resolveAddSet validates ids
    statuses.push({ id, bundle, installed: await isInstalled(bundle) })
  }

  for (const { bundle } of statuses.filter((s) => s.installed)) {
    p.log.info(`${bundle.name} is already installed — nothing to do`)
  }

  const toInstall = statuses.filter((s) => !s.installed)
  if (toInstall.length === 0) {
    p.outro('Everything requested is already installed.')
    return
  }

  if (implied.length > 0) {
    p.log.step(
      `Also adding required plugin${implied.length > 1 ? 's' : ''}: ${implied.join(', ')}`
    )
  }
  p.log.step(`Will add: ${toInstall.map((s) => s.bundle.name).join(', ')}`)

  const interactive = Boolean(process.stdout.isTTY && process.stdin.isTTY)
  if (!flags.yes && interactive) {
    const proceed = await p.confirm({
      message: flags.dryRun ? 'Preview changes?' : 'Proceed?',
    })
    if (p.isCancel(proceed) || !proceed) {
      p.cancel('Add cancelled')
      process.exit(0)
    }
  }

  const pinnedRef = await readPinnedRef()
  if (!(flags.from || flags.ref || pinnedRef)) {
    p.log.warn(
      'No pinned ref in package.json ("satus": { "ref": … }) — falling back to main. Pass --ref to pin.'
    )
  }

  const source = await resolvePayloadSource({
    from: flags.from,
    ref: flags.ref,
    pinnedRef,
  })
  p.log.step(`Payload source: ${source.label}`)

  let depsAdded = 0

  try {
    const payloadPkg = await readPayloadPackageJson(source)
    const s = p.spinner()

    for (const { bundle } of toInstall) {
      s.start(`Adding ${bundle.name}...`)
      const details: string[] = []

      const { copied, skipped } = await copyBundleFiles(source, bundle, flags)
      if (copied > 0) details.push(`${copied} files copied`)
      if (skipped > 0) details.push(`${skipped} existing files kept`)

      const overwrite = await applyOverwriteFiles(source, bundle, flags)
      if (overwrite.written.length > 0) {
        details.push(
          `${overwrite.written.length} integration-owned files restored`
        )
      }

      const deps = await addDependencies(bundle, payloadPkg, flags)
      depsAdded += deps.added.length
      if (deps.added.length > 0) {
        details.push(`${deps.added.length} dependencies pinned`)
      }

      const barrelChanges = await restoreBarrelExports(source, bundle, flags)
      if (barrelChanges > 0) {
        details.push(`${barrelChanges} barrel exports restored`)
      }

      const envChanges = await appendEnvStubs(bundle.envVars, flags.dryRun)
      if (envChanges > 0) details.push(`${envChanges} env stubs appended`)

      const transformChanges = await applyCodeTransforms(
        bundle.addTransforms ?? [],
        flags.dryRun
      )
      if (transformChanges > 0) {
        details.push(`${transformChanges} files re-wired`)
      }

      const verb = flags.dryRun ? 'Would add' : 'Added'
      const detail = details.length > 0 ? ` (${details.join(', ')})` : ''
      s.stop(`${verb} ${bundle.name}${detail}`)

      for (const rel of overwrite.skipped) {
        p.log.warn(
          `${rel} is locally modified — skipped. Re-run with --force to overwrite.`
        )
      }
      for (const dep of deps.missing) {
        p.log.warn(
          `"${dep}" is not in the payload package.json — install it manually.`
        )
      }

      if (deps.added.length > 0) {
        p.log.message(`  Pinned: ${deps.added.join(', ')}`)
      }
    }

    // Freshly copied payload files ship with EVERY integration's wiring (the
    // payload is the full repo) — e.g. lib/webgl/utils/fluid contains Theatre
    // hooks. Reuse the subtractive codeTransforms of each bundle that is
    // neither installed nor part of this add, so absent integrations stay
    // absent. These ops are no-ops on files already in the lean state.
    const stripTransforms: CodeTransform[] = []
    for (const [id, bundle] of getIntegrationEntries()) {
      if (order.includes(id)) continue
      if (await isInstalled(bundle)) continue
      stripTransforms.push(...bundle.codeTransforms)
    }
    if (stripTransforms.length > 0) {
      const stripped = await applyCodeTransforms(stripTransforms, flags.dryRun)
      if (stripped > 0) {
        p.log.step(
          `Stripped absent-integration wiring from ${stripped} copied files`
        )
      }
    }

    if (depsAdded > 0 && !flags.dryRun) {
      if (flags.skipInstall) {
        p.log.step('Skipped bun install (--skip-install) — run it manually')
      } else {
        s.start('Installing dependencies...')
        await Bun.$`bun install`.quiet()
        s.stop('Dependencies installed')
      }
    }
  } finally {
    await source.cleanup()
  }

  if (flags.dryRun) {
    p.outro('Dry run complete. Run without --dry-run to apply changes.')
  } else {
    p.outro('Done. Review the changes, then run: bun dev')
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const HELP = `Satūs Plugin CLI

Usage: bun run satus <command>

Commands:
  list                Show all plugins and their installed status
  add <plugin...>     Restore plugins from the satus repo payload

Options for add:
  --from <path>       Use a local satus checkout as the payload source
  --ref <gitRef>      Fetch the GitHub tarball at this ref
                      (default: package.json "satus.ref", then main)
  --dry-run           Print what would happen without writing anything
  --force             Overwrite existing / locally modified files
  --yes               Skip confirmation prompts (CI)
  --skip-install      Write package.json but do not run bun install
`

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  const command = argv[0]

  if (
    command === undefined ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    console.log(HELP)
    return
  }

  if (command === 'list') {
    await runList()
    return
  }

  if (command === 'add') {
    const { plugins, flags } = parseAddArgs(argv.slice(1))
    if (plugins.length === 0) {
      throw new Error('No plugins given. Usage: bun run satus add <plugin...>')
    }
    await runAdd(plugins, flags)
    return
  }

  throw new Error(`Unknown command "${command}". Run: bun run satus --help`)
}

// Run only when executed directly (not when imported by tests)
if (import.meta.main) {
  main().catch((error) => {
    p.log.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
