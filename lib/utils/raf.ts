/**
 * RAF Queue - Request Animation Frame Batching
 *
 * Batches DOM writes to prevent layout thrashing.
 * Uses Tempus for frame synchronization.
 *
 * @example
 * ```ts
 * import { mutate } from '@/utils/raf'
 *
 * await mutate(() => {
 *   element.style.transform = `translate(${width}px, ${height}px)`
 * })
 * ```
 */

import Tempus from 'tempus'

// Internal write queue
const writeQueue: Array<() => unknown> = []

// Guard against double-registration on module re-evaluation (HMR, duplicate
// chunks) — Tempus.add's unsubscribe isn't retained, so without this a
// re-eval would stack a second flush callback running every frame.
const REGISTERED_KEY = Symbol.for('satus.raf.flush')
const registry = globalThis as unknown as Record<symbol, unknown>
if (!registry[REGISTERED_KEY]) {
  // Process queue each frame via Tempus
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
 * Queue a DOM mutation (write operation).
 *
 * Use this for any operation that changes the DOM:
 * - Setting `style` properties
 * - Setting `className` or `classList`
 * - Setting attributes
 * - Modifying `innerHTML` or `textContent`
 *
 * @param fn - Function that performs the write
 * @returns Promise resolving when the write completes
 *
 * @example
 * ```ts
 * await mutate(() => {
 *   element.style.transform = 'translateX(100px)'
 *   element.classList.add('active')
 * })
 * ```
 */
export function mutate<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    writeQueue.push(() => resolve(fn()))
  })
}
