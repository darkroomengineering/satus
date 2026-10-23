import { access, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

import { z } from 'zod'

export const projectRoot = process.cwd()

export const resolvePath = (path: string): string => `${projectRoot}/${path}`

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Where the current directory sits in git: the main checkout, a linked
 * worktree, or outside any repo. A linked worktree shares `core.hooksPath`
 * with the main checkout, so `lefthook install` refuses it, and its `.git` is a
 * FILE, so an `existsSync('.git/hooks/...')` check always reports a false
 * failure there.
 */
export const detectGitLayout = (): 'main' | 'worktree' | 'no-git' => {
  const git = Bun.spawnSync([
    'git',
    'rev-parse',
    '--absolute-git-dir',
    '--git-common-dir',
  ])
  if (git.exitCode !== 0) return 'no-git'
  const [gitDir, commonDir] = git.stdout.toString().trim().split('\n')
  // Resolve both sides: on Windows git prints `C:/…` and resolve() gives `C:\…`.
  if (gitDir && commonDir && resolve(gitDir) !== resolve(commonDir))
    return 'worktree'
  return 'main'
}

/**
 * Marker `setup-project.ts` writes under `--skip-install` (oxfmt can't format
 * until `bun install` populates node_modules) and `prepare.ts` reads on the
 * next install to finish the deferred formatting. Lives here, not in
 * setup-project.ts, because prepare.ts ships with every scaffolded project and
 * must keep working after setup-project.ts self-prunes.
 */
export const PENDING_FORMAT_MARKER = '.setup-project-pending-format.json'

export const PendingFormatMarkerSchema = z.object({
  files: z.array(z.string()),
  /** Failed `prepare.ts` attempts so far; absent on the first. */
  attempts: z.number().optional(),
})

export type PendingFormatMarker = z.infer<typeof PendingFormatMarkerSchema>

/** Retries before `prepare.ts` deletes the marker with a manual-recovery instruction. */
export const PENDING_FORMAT_MAX_ATTEMPTS = 2

/**
 * Turn a failed removal into the error the caller sees. ENOENT is the one code
 * that means "nothing to delete" (the path vanished between the existence
 * check and the removal); every other code (EACCES, EPERM, EBUSY, ENOTEMPTY on
 * a locked tree) is a FAILED removal and must not read as success.
 */
const describeRemovalError = (
  what: string,
  path: string,
  error: Error | NodeJS.ErrnoException
): Error | undefined =>
  'code' in error && error.code === 'ENOENT'
    ? undefined
    : new Error(`Failed to remove ${what} ${path}: ${error.message}`, {
        cause: error,
      })

/**
 * Remove a directory recursively (`path` relative to project root). Returns
 * true when it was there and is now gone, false when there was nothing to
 * remove. Any other failure THROWS: reading a permission or lock error as
 * "absent" would report a half-stripped tree as clean, and `setup:project`
 * would self-prune on top of it.
 */
export const removeDir = async (
  path: string,
  dryRun = false
): Promise<boolean> => {
  const fullPath = resolvePath(path)

  if (!(await pathExists(fullPath))) return false
  if (dryRun) return true

  try {
    await rm(fullPath, { recursive: true, force: true })
  } catch (error) {
    if (!(error instanceof Error)) throw error
    const failure = describeRemovalError('directory', path, error)
    if (failure) throw failure
    return false
  }
  return true
}

/** Remove a file. Same contract as `removeDir`. */
export const removeFile = async (
  path: string,
  dryRun = false
): Promise<boolean> => {
  const fullPath = resolvePath(path)

  if (!(await Bun.file(fullPath).exists())) return false
  if (dryRun) return true

  try {
    await rm(fullPath, { force: true })
  } catch (error) {
    if (!(error instanceof Error)) throw error
    const failure = describeRemovalError('file', path, error)
    if (failure) throw failure
    return false
  }
  return true
}

export const bunExecutable = process.execPath

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
 * `undefined` when absent; the empty string when present without a value
 * (`--keep=` / trailing `--keep`), so callers can tell "not passed" from
 * "passed empty".
 *
 * First wins when a flag repeats, because `create-darkroom`'s cross-repo
 * scaffolding contract relies on it; the duplicate prints a warning naming the
 * value that won.
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

/** Copy text to the clipboard; false when no clipboard tool worked. */
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

/** `process.env` with FORCE_COLOR set and NO_COLOR removed (Node warns when both are set). */
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
