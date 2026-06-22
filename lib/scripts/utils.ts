/**
 * Shared Script Utilities
 *
 * Cross-platform utilities for CLI scripts.
 * Works on Windows, macOS, and Linux.
 */

import { access, mkdir, rm } from 'node:fs/promises'

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
export const parseCliFlags = (
  argv: string[] = process.argv.slice(2)
): {
  dryRun: boolean
  verbose: boolean
  help: boolean
  args: string[]
} => {
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
 */
export const getFlagValue = (
  argv: string[],
  flag: string
): string | undefined => {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === undefined) continue
    if (arg === flag) {
      const next = argv[i + 1]
      // A following flag (or nothing) means this one carries no value.
      if (next === undefined || next.startsWith('--')) return ''
      return next
    }
    if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1)
  }
  return undefined
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
      proc.stdin.write(text)
      proc.stdin.end()
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
          proc.stdin.write(text)
          proc.stdin.end()
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
      proc.stdin.write(text)
      proc.stdin.end()
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
  const env = { ...process.env, FORCE_COLOR: '1' } as Record<
    string,
    string | undefined
  >
  delete env.NO_COLOR
  return env
}
