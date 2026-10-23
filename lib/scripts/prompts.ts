/**
 * Prompt guards for the interactive CLI scripts (`setup:project`, `handoff`):
 * a cancelled or unanswered @clack/prompts call exits 1 with a plain reason
 * on stderr.
 */

import * as p from '@clack/prompts'

/**
 * Exit 1 when a @clack/prompts value is cancelled: a cancelled run never
 * completed, so it must not look like success. Also writes a plain line to
 * stderr so scripted/CI callers get a reason even if they discard the styled
 * stdout box. `nonInteractiveHint` (e.g. `--preset <key>`) is appended to that
 * line so a caller on a non-interactive harness knows how to skip the prompt.
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

/** Distinguishes "stdin closed" from a legitimate prompt value. */
const EOF_SENTINEL: unique symbol = Symbol('clack:stdin-eof')

/**
 * `cancelGuard(await promptFn(), …)` that also exits 1 when stdin closes
 * before the prompt resolves. @clack/core only settles on submit or cancel,
 * never on EOF, so a script piped `</dev/null` would otherwise hang until the
 * event loop drains and exit 0: a successful-looking no-op.
 *
 * Answer-wins ordering: `printf '\n' | bun run script` (a valid keystroke
 * followed by the pipe closing) can fire `close` before @clack/core's
 * resolution microtask runs. The `close` handler therefore defers via
 * `setImmediate`, which runs after every queued microtask, so a real answer
 * flips `answered` first. Only a genuinely unanswered prompt reaches the EOF
 * branch.
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
