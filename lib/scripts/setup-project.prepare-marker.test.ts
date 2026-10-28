import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { copyRepo } from './setup-project.test-helpers'
import {
  PENDING_FORMAT_MARKER,
  PENDING_FORMAT_MAX_ATTEMPTS,
  pathExists,
} from './utils'

// prepare.ts's pending-format marker is unvalidated: a malformed marker must
// not throw before unlinking (bricking every later `bun install`), and a
// format/manifest failure must keep the marker so the retry survives.

describe('prepare.ts pending-format marker (defensive handling)', () => {
  const setupCopy = async (): Promise<string> => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-prepare-'))
    await copyRepo(tmpRoot)
    return tmpRoot
  }

  const runPrepare = (cwd: string) =>
    Bun.spawnSync(['bun', 'lib/scripts/prepare.ts'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    })

  it('a malformed marker (invalid JSON) is deleted, not thrown — install survives', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(markerPath, '{ this is not valid json')

      const proc = runPrepare(tmpRoot)

      // Never crashes: prepare.ts must run to completion regardless of a
      // corrupt marker, or `bun install` (which always runs `prepare`)
      // would fail forever on the exact same crash.
      expect(proc.exitCode).toBe(0)
      expect(
        (proc.stdout.toString() + proc.stderr.toString()).toLowerCase()
      ).toContain('malformed')
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a marker missing the required "files" array is deleted, not thrown', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(markerPath, `${JSON.stringify({ notFiles: 'oops' })}\n`)

      const proc = runPrepare(tmpRoot)

      expect(proc.exitCode).toBe(0)
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a listed file that no longer exists is skipped with a note, not a failure', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(
        markerPath,
        `${JSON.stringify({ files: ['lib/scripts/this-file-does-not-exist.ts'] })}\n`
      )

      const proc = runPrepare(tmpRoot)

      expect(proc.exitCode).toBe(0)
      expect(
        (proc.stdout.toString() + proc.stderr.toString()).toLowerCase()
      ).toContain('no longer exists')
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a real marker is finished successfully: files formatted, manifest regenerated, marker deleted', async () => {
    const tmpRoot = await setupCopy()
    try {
      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      // A real, tracked file — formatting it is a genuine (harmless) no-op
      // since it's already correctly formatted.
      await Bun.write(
        markerPath,
        `${JSON.stringify({ files: ['lib/scripts/utils.ts'] })}\n`
      )

      const proc = runPrepare(tmpRoot)

      if (proc.exitCode !== 0) {
        console.error(proc.stdout.toString())
        console.error(proc.stderr.toString())
      }
      expect(proc.exitCode).toBe(0)
      expect(await pathExists(markerPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a repeatedly-failing step keeps the marker (with attempts incrementing) up to the cap, then gives up loudly instead of retrying forever', async () => {
    const tmpRoot = await setupCopy()
    try {
      const pkgPath = join(tmpRoot, 'package.json')
      const pkg = JSON.parse(await Bun.file(pkgPath).text()) as {
        scripts: Record<string, string>
      }
      pkg.scripts.format = 'exit 1'
      await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

      const markerPath = join(tmpRoot, PENDING_FORMAT_MARKER)
      await Bun.write(
        markerPath,
        `${JSON.stringify({ files: ['lib/scripts/utils.ts'] })}\n`
      )

      // Run PENDING_FORMAT_MAX_ATTEMPTS times: every run but the last keeps
      // the marker with `attempts` incremented; the last one gives up and
      // deletes it instead of looping forever.
      for (let attempt = 1; attempt <= PENDING_FORMAT_MAX_ATTEMPTS; attempt++) {
        const proc = runPrepare(tmpRoot)
        expect(proc.exitCode).toBe(0) // never bricks install, even on failure

        if (attempt < PENDING_FORMAT_MAX_ATTEMPTS) {
          expect(await pathExists(markerPath)).toBe(true)
          const marker = JSON.parse(await Bun.file(markerPath).text()) as {
            attempts?: number
          }
          expect(marker.attempts).toBe(attempt)
          const output = proc.stdout.toString() + proc.stderr.toString()
          expect(output).toContain('will retry')
          expect(output).toContain('bun run format')
        } else {
          expect(await pathExists(markerPath)).toBe(false)
          const output = proc.stdout.toString() + proc.stderr.toString()
          expect(output.toLowerCase()).toContain('giving up')
        }
      }
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})
