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

import * as p from '@clack/prompts'

import {
  installBundle,
  isInstalled,
  stripAbsentIntegrationWiring,
} from './bundle-installer'
import {
  type BundleId,
  getIntegrationEntries,
  INTEGRATION_BUNDLES,
  type IntegrationBundle,
} from './integration-bundles'
import {
  readPayloadPackageJson,
  readPinnedRef,
  resolvePayloadSource,
} from './payload-source'

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
  order: BundleId[]
  implied: BundleId[]
} {
  const knownIds = Object.keys(INTEGRATION_BUNDLES) as BundleId[]

  const requestedIds: BundleId[] = requested.map((id) => {
    if (!(knownIds as string[]).includes(id)) {
      throw new Error(
        `Unknown plugin "${id}". Available: ${knownIds.join(', ')}`
      )
    }
    return id as BundleId
  })

  const order: BundleId[] = []
  const visiting = new Set<BundleId>()

  const visit = (id: BundleId): void => {
    if (order.includes(id)) return
    if (visiting.has(id)) {
      throw new Error(`Circular "requires" chain detected at "${id}"`)
    }
    visiting.add(id)
    for (const dep of INTEGRATION_BUNDLES[id].requires ?? []) {
      visit(dep as BundleId)
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
    id: BundleId
    bundle: IntegrationBundle
    installed: boolean
  }[] = []
  for (const id of order) {
    const bundle = INTEGRATION_BUNDLES[id] // total: resolveAddSet validates ids
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

  let totalDepsAdded = 0

  try {
    const payloadPkg = await readPayloadPackageJson(source)
    const s = p.spinner()

    for (const { bundle } of toInstall) {
      s.start(`Adding ${bundle.name}...`)

      const { details, depsAdded, overwriteSkipped, depsMissing } =
        await installBundle(source, bundle, payloadPkg, flags)
      totalDepsAdded += depsAdded.length

      const verb = flags.dryRun ? 'Would add' : 'Added'
      const detail = details.length > 0 ? ` (${details.join(', ')})` : ''
      s.stop(`${verb} ${bundle.name}${detail}`)

      for (const rel of overwriteSkipped) {
        p.log.warn(
          `${rel} is locally modified — skipped. Re-run with --force to overwrite.`
        )
      }
      for (const dep of depsMissing) {
        p.log.warn(
          `"${dep}" is not in the payload package.json — install it manually.`
        )
      }

      if (depsAdded.length > 0) {
        p.log.message(`  Pinned: ${depsAdded.join(', ')}`)
      }
    }

    // Freshly copied payload files ship with EVERY integration's wiring (the
    // payload is the full repo) — e.g. lib/webgl/utils/fluid contains Theatre
    // hooks. Reuse the subtractive codeTransforms of each bundle that is
    // neither installed nor part of this add, so absent integrations stay
    // absent. These ops are no-ops on files already in the lean state.
    const stripped = await stripAbsentIntegrationWiring(order, flags.dryRun)
    if (stripped > 0) {
      p.log.step(
        `Stripped absent-integration wiring from ${stripped} copied files`
      )
    }

    if (totalDepsAdded > 0 && !flags.dryRun) {
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
