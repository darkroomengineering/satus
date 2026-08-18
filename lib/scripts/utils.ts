/**
 * Shared Script Utilities
 *
 * Cross-platform utilities for CLI scripts.
 * Works on Windows, macOS, and Linux.
 */

import { access, mkdir, rm } from 'node:fs/promises'

import { z } from 'zod'

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get the project root directory
 */
export const projectRoot = process.cwd()

/**
 * Resolve a path relative to the project root
 */
export const resolvePath = (path: string): string => `${projectRoot}/${path}`

/**
 * Check if a file or directory exists
 */
export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// setup:project ↔ prepare handoff (P-B2)
// ============================================================================

/**
 * Marker file `setup-project.ts` writes when it ran with `--skip-install`
 * (oxfmt can't format anything until `bun install` has populated
 * node_modules — see `setup-project.ts`'s "Post-run cleanup" docstring) and
 * `prepare.ts` reads on the next `bun install` to finish the deferred
 * formatting. Lives here (not in setup-project.ts) because prepare.ts ships
 * with every scaffolded project and must keep working after setup-project.ts
 * self-prunes.
 */
export const PENDING_FORMAT_MARKER = '.setup-project-pending-format.json'

/** Schema for `PENDING_FORMAT_MARKER`'s JSON contents. */
export const PendingFormatMarkerSchema = z.object({
  files: z.array(z.string()),
  /**
   * Number of times `prepare.ts` has already tried (and failed) to finish
   * this marker. Absent/0 on the first attempt. `prepare.ts` deletes the
   * marker with a loud instruction once `attempts` reaches
   * `PENDING_FORMAT_MAX_ATTEMPTS`, instead of retrying forever on every
   * future `bun install`.
   */
  attempts: z.number().optional(),
})

/** Shape of `PENDING_FORMAT_MARKER`'s JSON contents. */
export type PendingFormatMarker = z.infer<typeof PendingFormatMarkerSchema>

/**
 * How many times `prepare.ts` retries a failed format/manifest step before
 * giving up and deleting `PENDING_FORMAT_MARKER` outright (with a loud,
 * copy-pasteable manual-recovery instruction).
 */
export const PENDING_FORMAT_MAX_ATTEMPTS = 2

// ============================================================================
// File System Operations (Cross-platform)
// ============================================================================

/**
 * Remove a directory recursively
 * @param path - Relative path from project root
 * @param dryRun - If true, skip actual deletion
 */
export const removeDir = async (
  path: string,
  dryRun = false
): Promise<boolean> => {
  try {
    const fullPath = resolvePath(path)

    // Check if path exists
    if (!(await pathExists(fullPath))) {
      return false
    }

    if (!dryRun) {
      await rm(fullPath, { recursive: true, force: true })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Remove a file
 * @param path - Relative path from project root
 * @param dryRun - If true, skip actual deletion
 */
export const removeFile = async (
  path: string,
  dryRun = false
): Promise<boolean> => {
  try {
    const fullPath = resolvePath(path)
    const file = Bun.file(fullPath)
    const exists = await file.exists()

    if (!exists) return false

    if (!dryRun) {
      await rm(fullPath, { force: true })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Create a directory (and parent directories if needed)
 * @param path - Relative path from project root
 */
export const createDir = async (path: string): Promise<void> => {
  await mkdir(resolvePath(path), { recursive: true })
}

// ============================================================================
// Process Utilities
// ============================================================================

/**
 * Get the current Bun executable path (cross-platform)
 */
export const bunExecutable = process.execPath

// ============================================================================
// CLI Argument Utilities
// ============================================================================

/**
 * Parse common CLI flags from process.argv
 */
export const parseCliFlags = (argv: string[] = process.argv.slice(2)) => {
  return {
    dryRun: argv.includes('--dry-run') || argv.includes('-d'),
    verbose: argv.includes('--verbose') || argv.includes('-v'),
    help: argv.includes('--help') || argv.includes('-h'),
    args: argv.filter(
      (arg) =>
        !['--dry-run', '-d', '--verbose', '-v', '--help', '-h'].includes(arg)
    ),
  }
}

/**
 * Read the value of a `--flag value` or `--flag=value` CLI argument.
 *
 * Returns `undefined` when the flag is absent, and the empty string when the
 * flag is present without a value (`--keep=` / trailing `--keep`), so callers
 * can distinguish "not passed" from "passed empty".
 *
 * First-wins semantics are preserved when a flag is passed more than once
 * (kept deliberately — see `--force`/`--yes` style flags used by
 * `create-darkroom`'s cross-repo scaffolding contract), but a duplicate now
 * prints a warning naming the flag and the value that won, instead of
 * silently discarding the later value (L4).
 */
export const getFlagValue = (
  argv: string[],
  flag: string
): string | undefined => {
  let result: string | undefined
  let seen = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === undefined) continue

    let value: string | undefined
    if (arg === flag) {
      const next = argv[i + 1]
      // A following flag (or nothing) means this one carries no value.
      value = next === undefined || next.startsWith('--') ? '' : next
    } else if (arg.startsWith(`${flag}=`)) {
      value = arg.slice(flag.length + 1)
    } else {
      continue
    }

    if (seen) {
      console.warn(
        `Warning: "${flag}" was passed more than once — using "${result}", ignoring "${value}"`
      )
    } else {
      result = value
      seen = true
    }
  }

  return result
}

// ============================================================================
// Clipboard Utilities (Cross-platform)
// ============================================================================

/**
 * Copy text to clipboard (cross-platform)
 * @returns true if successful, false otherwise
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (process.platform === 'darwin') {
      const proc = Bun.spawn(['pbcopy'], { stdin: 'pipe' })
      void proc.stdin.write(text)
      void proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    if (process.platform === 'linux') {
      // Try xclip first, then xsel
      for (const cmd of [
        ['xclip', '-selection', 'clipboard'],
        ['xsel', '--clipboard', '--input'],
      ]) {
        try {
          const proc = Bun.spawn(cmd, { stdin: 'pipe' })
          void proc.stdin.write(text)
          void proc.stdin.end()
          await proc.exited
          if (proc.exitCode === 0) return true
        } catch {
          // Silently try next clipboard command
        }
      }
      return false
    }

    if (process.platform === 'win32') {
      const proc = Bun.spawn(['clip'], { stdin: 'pipe' })
      void proc.stdin.write(text)
      void proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    return false
  } catch {
    return false
  }
}

/**
 * Build environment with FORCE_COLOR enabled
 * Removes NO_COLOR to prevent warnings
 */
export const colorEnv = (): Record<string, string | undefined> => {
  // SAFETY: Object.assign's overloads intersect process.env's index signature
  // with the FORCE_COLOR literal, so the result is exactly a string-keyed,
  // string-or-undefined-valued environment dictionary.
  const env = Object.assign({}, process.env, { FORCE_COLOR: '1' }) as Record<
    string,
    string | undefined
  >
  delete env.NO_COLOR
  return env
}
