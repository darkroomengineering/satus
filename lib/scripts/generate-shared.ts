/**
 * Shared utilities for generate-component.ts and generate-page.ts.
 *
 * Extracted from duplicated orchestration logic — templates and prompts remain
 * in their respective modules to preserve exact generated output.
 */

import * as p from '@clack/prompts'

// ---------------------------------------------------------------------------
// String-casing helpers
// ---------------------------------------------------------------------------

/**
 * Convert kebab-case to PascalCase.
 *
 * @example toPascalCase('my-component') → 'MyComponent'
 */
export function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/**
 * Convert kebab-case to camelCase.
 *
 * @example toCamelCase('my-component') → 'myComponent'
 */
export function toCamelCase(str: string): string {
  return str
    .split('-')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('')
}

// ---------------------------------------------------------------------------
// Cancel guard
// ---------------------------------------------------------------------------

/**
 * Exit gracefully when a @clack/prompts value is cancelled.
 *
 * Calls `p.cancel(message)` and `process.exit(0)` when `p.isCancel(value)` is
 * true.  Returns the unwrapped value otherwise (the TypeScript overload ensures
 * the caller receives the plain type, not `symbol | T`).
 */
export function cancelGuard<T>(value: T | symbol, message: string): T {
  if (p.isCancel(value)) {
    p.cancel(message)
    process.exit(0)
  }
  return value as T
}

// ---------------------------------------------------------------------------
// Spinner wrapper
// ---------------------------------------------------------------------------

/**
 * Run `fn` inside a @clack/prompts spinner.
 *
 * Starts the spinner with `startMessage`, stops it with `stopMessage` on
 * success, or stops with `failMessage` and re-throws on error.
 */
export async function withSpinner(
  startMessage: string,
  stopMessage: string,
  failMessage: string,
  fn: () => Promise<void>
): Promise<void> {
  const spinner = p.spinner()
  spinner.start(startMessage)
  try {
    await fn()
    spinner.stop(stopMessage)
  } catch (error) {
    spinner.stop(failMessage)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

// ---------------------------------------------------------------------------
// Overwrite guard
// ---------------------------------------------------------------------------

/**
 * Refuse to proceed if any of the given paths already exist on disk.
 *
 * Scaffolders must never silently overwrite hand-edited output. Throws
 * before any file is written, naming the first existing path, so the
 * caller's try/catch (see generate.ts) surfaces a clear message and exits
 * non-zero with zero writes performed.
 */
export async function refuseIfExists(paths: string[]): Promise<void> {
  for (const path of paths) {
    if (await Bun.file(path).exists()) {
      throw new Error(
        `"${path}" already exists. Refusing to overwrite it — remove the file first or choose a different name.`
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Post-write formatting
// ---------------------------------------------------------------------------

/**
 * Run oxfmt on freshly generated files so template drift can never regress
 * the `oxfmt --check` gate that `bun run check` enforces.
 *
 * Best-effort: a formatting failure is surfaced as a warning, not thrown —
 * a missing/broken oxfmt binary shouldn't block scaffolding.
 */
export async function formatGeneratedFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  try {
    const proc = Bun.spawn(['bun', 'oxfmt', ...paths], {
      stdout: 'ignore',
      stderr: 'pipe',
    })
    const [exitCode, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stderr).text(),
    ])
    if (exitCode !== 0) {
      p.log.warn(`oxfmt formatting failed: ${stderr.trim()}`)
    }
  } catch (error) {
    p.log.warn(
      `Could not run oxfmt on generated files: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
