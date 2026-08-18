/**
 * `prepare` entry point — installs the lefthook git hooks, and finishes any
 * `setup:project` run that deferred formatting + COMPONENTS.md regeneration
 * because it ran with `--skip-install` (P-B2): oxfmt can't run until `bun
 * install` has populated node_modules (its own `oxfmt.config.ts` imports the
 * `oxfmt` package for typed config authoring, which doesn't resolve on a
 * bare `--skip-install` tree), and generate-manifest.ts resolves actual type
 * information via ts-morph, so regenerating it before that install can
 * produce a manifest that doesn't match the real, post-install types. `bun
 * install` always runs `prepare` afterward (unless `--ignore-scripts`), so
 * this is the first reliable point in that flow to finish the job — see
 * `PENDING_FORMAT_MARKER` in `./utils.ts`.
 *
 * The marker handoff is defensive by design (cross-model review finding):
 *   - A malformed/partial marker (bad JSON, missing `files`) is warned about
 *     and deleted, never thrown — an uncaught exception here would crash
 *     `prepare.ts` before the marker is removed, and since `bun install`
 *     always re-runs `prepare`, that would brick every future `bun install`
 *     in the project on the same crash, forever.
 *   - Listed files that no longer exist (moved/deleted since setup ran) are
 *     skipped with a note instead of failing oxfmt on a missing path.
 *   - On a format/manifest step failure, the marker is KEPT (with its
 *     `attempts` counter incremented) so the NEXT `bun install` retries,
 *     and the exact manual recovery commands are printed either way. Capped
 *     at `PENDING_FORMAT_MAX_ATTEMPTS`: past that, the marker is deleted
 *     with a loud instruction instead of retrying forever.
 *
 * In a linked worktree (`git worktree add`), the repo config is shared with the
 * main checkout and `core.hooksPath` already points at its `.git/hooks`, so the
 * hooks apply here without installing anything — and `lefthook install` refuses
 * to run against that path and fails the whole `bun install`. Skip it instead.
 * Outside a git repo (exported archive, CI cache restore) there is nothing to
 * install into, so that skips too. Neither skip affects the pending-format
 * check above, which runs regardless.
 */

import { unlink } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  PENDING_FORMAT_MARKER,
  PENDING_FORMAT_MAX_ATTEMPTS,
  PendingFormatMarkerSchema,
  type PendingFormatMarker,
  pathExists,
  resolvePath,
} from './utils'

const markerPath = resolvePath(PENDING_FORMAT_MARKER)

const deleteMarker = async (): Promise<void> => {
  try {
    await unlink(markerPath)
  } catch {
    // Already gone (or unremovable) — nothing more to do.
  }
}

if (await pathExists(markerPath)) {
  let marker: PendingFormatMarker | undefined
  try {
    const raw: unknown = await Bun.file(markerPath).json()
    const parsed = PendingFormatMarkerSchema.safeParse(raw)
    if (parsed.success) marker = parsed.data
  } catch {
    // Malformed JSON — `marker` stays undefined, handled below.
  }

  if (!marker) {
    console.warn(
      `prepare: ${PENDING_FORMAT_MARKER} is malformed — ignoring and deleting it. If \`setup:project --skip-install\` just ran, finish manually: bun run format <files> && bun run generate:manifest`
    )
    await deleteMarker()
  } else {
    const attempts = (marker.attempts ?? 0) + 1

    // Skip files that no longer exist since setup ran, rather than failing
    // oxfmt on a missing path.
    const existingFiles: string[] = []
    for (const file of marker.files) {
      if (await pathExists(resolvePath(file))) {
        existingFiles.push(file)
      } else {
        console.warn(`prepare: ${file} no longer exists — skipping`)
      }
    }

    let ok = true

    if (existingFiles.length > 0) {
      console.log(
        `prepare: finishing a deferred \`setup:project --skip-install\` run — formatting ${existingFiles.length} file${existingFiles.length === 1 ? '' : 's'}`
      )
      const format = Bun.spawnSync(['bun', 'run', 'format', ...existingFiles], {
        stdout: 'inherit',
        stderr: 'inherit',
      })
      if (format.exitCode !== 0) {
        ok = false
      }
    }

    console.log('prepare: regenerating COMPONENTS.md')
    const manifest = Bun.spawnSync(['bun', 'run', 'generate:manifest'], {
      stdout: 'inherit',
      stderr: 'inherit',
    })
    if (manifest.exitCode !== 0) {
      ok = false
    }

    if (ok) {
      await deleteMarker()
    } else {
      const manualCommand =
        existingFiles.length > 0
          ? `bun run format ${existingFiles.join(' ')} && bun run generate:manifest`
          : 'bun run generate:manifest'

      if (attempts >= PENDING_FORMAT_MAX_ATTEMPTS) {
        console.warn(
          `prepare: giving up after ${attempts} attempt${attempts === 1 ? '' : 's'} — deleting the marker so future \`bun install\` runs stop retrying. Finish manually: ${manualCommand}`
        )
        await deleteMarker()
      } else {
        // Keep the marker (with the attempt count bumped) so the next
        // `bun install` retries — never brick install itself on a failure
        // here; this script still finishes and lefthook still runs below.
        await Bun.write(
          markerPath,
          `${JSON.stringify({ files: existingFiles, attempts }, null, 2)}\n`
        )
        console.warn(
          `prepare: will retry on the next \`bun install\` (attempt ${attempts}/${PENDING_FORMAT_MAX_ATTEMPTS}). To finish now instead: ${manualCommand}`
        )
      }
    }
  }
}

const git = Bun.spawnSync([
  'git',
  'rev-parse',
  '--absolute-git-dir',
  '--git-common-dir',
])

if (git.exitCode !== 0) {
  console.log('prepare: not a git repository, skipping lefthook install')
  process.exit(0)
}

const [gitDir, commonDir] = git.stdout.toString().trim().split('\n')

if (gitDir && commonDir && gitDir !== resolve(commonDir)) {
  console.log(
    'prepare: linked worktree, hooks are shared with the main checkout — skipping lefthook install'
  )
  process.exit(0)
}

const lefthook = Bun.spawnSync(['bunx', 'lefthook', 'install'], {
  stdout: 'inherit',
  stderr: 'inherit',
})

process.exit(lefthook.exitCode ?? 1)
