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
