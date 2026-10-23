import Tempus from 'tempus'

const writeQueue: (() => void)[] = []

// Guards against double registration on module re-evaluation (HMR, duplicate
// chunks): Tempus.add's unsubscribe isn't retained, so a re-eval would stack a
// second flush callback running every frame.
const REGISTERED_KEY = Symbol.for('satus.raf.flush')
// SAFETY: globalThis's declared type has no symbol-keyed index signature to
// merge this module-private registration flag into; a single-step assertion
// to the shape we actually read/write is honest about what's really there.
const registry = globalThis as Record<symbol, boolean>
if (!registry[REGISTERED_KEY]) {
  Tempus.add(
    () => {
      for (const fn of writeQueue) fn()
      writeQueue.length = 0
    },
    { order: 1000 }
  )
  registry[REGISTERED_KEY] = true
}

/**
 * Queues a DOM write (style, class, attribute, text) to flush on the next
 * Tempus frame, batching writes to avoid layout thrashing. Resolves with the
 * function's result once it ran.
 */
export function mutate<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    writeQueue.push(() => resolve(fn()))
  })
}
