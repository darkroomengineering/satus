/**
 * `prepare` entry point: installs the lefthook git hooks, and finishes any
 * `setup:project --skip-install` run that deferred formatting and COMPONENTS.md
 * regeneration (see `PENDING_FORMAT_MARKER` in `./utils.ts`). oxfmt can't run
 * before `bun install` (its config imports the `oxfmt` package), and the
 * manifest resolves types via ts-morph, so generating it earlier can disagree
 * with the post-install types. `bun install` always runs `prepare` afterward,
 * which makes this the first reliable point to finish the job.
 *
 * The marker handoff must never throw: `bun install` re-runs `prepare` every
 * time, so a crash before the marker is removed would brick every future
 * install.
 *   - A malformed marker is warned about and deleted.
 *   - Listed files that no longer exist are skipped.
 *   - On a format/manifest failure the marker is KEPT with `attempts`
 *     incremented, so the next `bun install` retries. Past
 *     `PENDING_FORMAT_MAX_ATTEMPTS` it is deleted with a loud instruction.
 *
 * In a linked worktree, `core.hooksPath` already points at the main checkout's
 * hooks and `lefthook install` refuses that path, failing the whole
 * `bun install`, so it is skipped. Outside a git repo there is nothing to
 * install into. Neither skip affects the pending-format check, which runs
 * regardless.
 */

import { unlink } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  PENDING_FORMAT_MARKER,
  PENDING_FORMAT_MAX_ATTEMPTS,
  type PendingFormatMarker,
  PendingFormatMarkerSchema,
  pathExists,
  resolvePath,
} from './utils'

const markerPath = resolvePath(PENDING_FORMAT_MARKER)

const deleteMarker = async (): Promise<void> => {
  try {
    await unlink(markerPath)
  } catch {
    // Already gone.
  }
}

if (await pathExists(markerPath)) {
  let marker: PendingFormatMarker | undefined
  try {
    const raw: unknown = await Bun.file(markerPath).json()
    const parsed = PendingFormatMarkerSchema.safeParse(raw)
    if (parsed.success) marker = parsed.data
  } catch {
    // Malformed JSON: marker stays undefined.
  }

  if (!marker) {
    console.warn(
      `prepare: ${PENDING_FORMAT_MARKER} is malformed — ignoring and deleting it. If \`setup:project --skip-install\` just ran, finish manually: bun run format <files> && bun run generate:manifest`
    )
    await deleteMarker()
  } else {
    const attempts = (marker.attempts ?? 0) + 1

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

// Resolve both sides: on Windows git prints `C:/…` and resolve() gives `C:\…`.
if (gitDir && commonDir && resolve(gitDir) !== resolve(commonDir)) {
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
