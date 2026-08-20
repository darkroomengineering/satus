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
 * Convert kebab-case (or snake_case — `generate-page.ts`'s name validator
 * allows both hyphens and underscores, L9) to PascalCase.
 *
 * @example toPascalCase('my-component') → 'MyComponent'
 * @example toPascalCase('my_page') → 'MyPage'
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
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
 * Exit loudly when a @clack/prompts value is cancelled (P-D2).
 *
 * Calls `p.cancel(message)` (the pretty interactive box), writes a plain
 * one-line version of `message` to stderr (so scripted/CI callers get a
 * machine-visible reason even when they discard the styled stdout box), and
 * exits 1 — not 0: a cancelled run never completed, so it should never look
 * like success to a caller checking the exit code. `nonInteractiveHint`,
 * when given, is appended to the stderr line (e.g. `--preset <key>` or
 * `--keep <id,id,...>`) so a script that hit this by piping `</dev/null` or
 * running under a non-interactive harness knows how to avoid the prompt
 * next time.
 *
 * Returns the unwrapped value when not cancelled (the TypeScript overload
 * ensures the caller receives the plain type, not `symbol | T`).
 */
export function cancelGuard<T>(
  value: T | symbol,
  message: string,
  nonInteractiveHint?: string
): T {
  if (p.isCancel(value)) {
    p.cancel(message)
    console.error(
      nonInteractiveHint
        ? `${message} — use ${nonInteractiveHint} instead.`
        : message
    )
    process.exit(1)
  }
  return value
}

// ---------------------------------------------------------------------------
// EOF guard
// ---------------------------------------------------------------------------

/** Private sentinel distinguishing "stdin closed" from a legitimate prompt value. */
const EOF_SENTINEL: unique symbol = Symbol('clack:stdin-eof')

/**
 * Await an interactive @clack/prompts call, but fail loudly instead of
 * silently exiting 0 when stdin closes (EOF) before the prompt resolves
 * (P-D2).
 *
 * @clack/core's prompt engine only ever settles its promise on Enter/submit
 * or Ctrl+C/cancel — never on stdin EOF. A script piped `</dev/null` (or run
 * under any harness that closes stdin before answering) hangs forever from
 * the awaited Promise's perspective; `p.isCancel()` is never reached because
 * the prompt never resolves at all. With nothing else keeping Node's event
 * loop alive, the process then exits 0 on its own once the loop drains — a
 * silent, successful-looking no-op that did nothing.
 *
 * Races the prompt against stdin's `close` event. If stdin closes first,
 * this prints the same clear stderr message `cancelGuard` would and exits 1
 * immediately, instead of letting the silent exit-0 happen. Otherwise
 * behaves exactly like `cancelGuard(await promptFn(), message, nonInteractiveHint)`.
 *
 * Answer-wins ordering: a legitimate final answer can race stdin's `close`
 * event — e.g. `printf '\n' | bun run script` (a valid default-confirm
 * keystroke immediately followed by the pipe closing) can fire `close`
 * before @clack/core's own promise-resolution microtask for that keystroke
 * has run, since `close` is a synchronous EventEmitter callback while a
 * promise resolution's reactions are always at least one microtask removed.
 * The `close` handler doesn't resolve the EOF race directly — it defers via
 * `setImmediate`, which runs only after every already-queued microtask
 * (including the prompt's own resolution below) has drained, so a real
 * answer always gets to flip `answered` first. Only a genuinely-unanswered
 * prompt — nothing pending to drain — reaches the EOF branch.
 */
export async function guardedPrompt<T>(
  promptFn: () => Promise<T | symbol>,
  message: string,
  nonInteractiveHint?: string
): Promise<T> {
  let answered = false
  let onClose: (() => void) | undefined

  const detach = (): void => {
    if (onClose) {
      process.stdin.off('close', onClose)
      onClose = undefined
    }
  }

  const eof = new Promise<typeof EOF_SENTINEL>((resolve) => {
    onClose = () => {
      setImmediate(() => {
        if (!answered) resolve(EOF_SENTINEL)
      })
    }
    process.stdin.once('close', onClose)
  })

  const answer = promptFn().then((value) => {
    answered = true
    detach()
    return value
  })

  try {
    const result = await Promise.race([answer, eof])
    if (result === EOF_SENTINEL) {
      console.error(
        `${message} (stdin closed before it could be answered)${
          nonInteractiveHint ? ` — use ${nonInteractiveHint} instead.` : '.'
        }`
      )
      process.exit(1)
    }
    return cancelGuard(result, message, nonInteractiveHint)
  } finally {
    detach()
  }
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
