/**
 * RAF Queue - Request Animation Frame Batching
 *
 * Batches DOM reads and writes to prevent layout thrashing.
 * Uses Tempus for frame synchronization.
 *
 * ## The Problem: Layout Thrashing
 *
 * When you interleave DOM reads and writes, the browser must recalculate
 * layout multiple times per frame:
 *
 * ```ts
 * // ❌ BAD: Causes layout thrashing
 * element1.style.width = '100px'  // Write → triggers layout
 * const height = element2.offsetHeight  // Read → forces layout recalc
 * element3.style.height = height + 'px' // Write → triggers layout again
 * ```
 *
 * ## The Solution: Batch Operations
 *
 * ```ts
 * // ✅ GOOD: Batch reads, then batch writes
 * import { measure, mutate } from '@/utils/raf'
 *
 * // All reads happen first
 * const height = await measure(() => element.offsetHeight)
 *
 * // Then all writes
 * await mutate(() => {
 *   element.style.height = height + 'px'
 * })
 * ```
 *
 * @example
 * ```ts
 * import { measure, mutate } from '@/utils/raf'
 *
 * // Read multiple values
 * const [width, height] = await Promise.all([
 *   measure(() => element.offsetWidth),
 *   measure(() => element.offsetHeight),
 * ])
 *
 * // Write multiple values
 * await mutate(() => {
 *   element.style.transform = `translate(${width}px, ${height}px)`
 * })
 * ```
 */

import Tempus from 'tempus'

// Internal queues
const readQueue: Array<() => unknown> = []
const writeQueue: Array<() => unknown> = []

// Process queues each frame via Tempus
Tempus.add(
  () => {
    // Process all reads first (measurements)
    for (const fn of readQueue) fn()
    readQueue.length = 0

    // Then process all writes (mutations)
    for (const fn of writeQueue) fn()
    writeQueue.length = 0
  },
  { priority: 1000 }
)

/**
 * Queue a DOM measurement (read operation).
 *
 * Use this for any operation that reads layout properties:
 * - `offsetWidth`, `offsetHeight`
 * - `getBoundingClientRect()`
 * - `getComputedStyle()`
 * - `scrollTop`, `scrollLeft`
 *
 * @param fn - Function that performs the read
 * @returns Promise resolving to the read value
 *
 * @example
 * ```ts
 * const rect = await measure(() => element.getBoundingClientRect())
 * const scroll = await measure(() => window.scrollY)
 * ```
 */
export function measure<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    readQueue.push(() => resolve(fn()))
  })
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

/**
 * Batch multiple reads and writes efficiently.
 *
 * @param reads - Functions that read from DOM
 * @param writes - Functions that write to DOM (receives read results)
 *
 * @example
 * ```ts
 * await batch(
 *   // Reads
 *   [
 *     () => el1.offsetWidth,
 *     () => el2.offsetHeight,
 *   ],
 *   // Writes (receives read results)
 *   ([width, height]) => {
 *     el3.style.width = width + 'px'
 *     el3.style.height = height + 'px'
 *   }
 * )
 * ```
 */
export async function batch<T extends unknown[]>(
  reads: { [K in keyof T]: () => T[K] },
  write: (results: T) => void
): Promise<void> {
  const results = (await Promise.all(reads.map((fn) => measure(fn)))) as T
  await mutate(() => write(results))
}
