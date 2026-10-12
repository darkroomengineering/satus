/**
 * Prompt guards for the interactive CLI scripts (`setup:project`, `handoff`):
 * a cancelled or unanswered @clack/prompts call exits 1 with a plain reason
 * on stderr.
 */

import * as p from '@clack/prompts'

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
 * ensures the caller receives the plain type, not `typeof p.CANCEL_SYMBOL | T`).
 */
export function cancelGuard<T>(
  value: T | typeof p.CANCEL_SYMBOL,
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
  promptFn: () => Promise<T | typeof p.CANCEL_SYMBOL>,
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
