/**
 * Animation Utilities
 *
 * High-level animation helpers that combine math, easings, and timing.
 * For lower-level utilities, see:
 * - `@/utils/math` - clamp, lerp, mapRange, etc.
 * - `@/utils/easings` - easing functions
 * - `@/utils/raf` - DOM batching (measure, mutate)
 *
 * @example
 * ```ts
 * import { fromTo, stagger, ease } from '@/utils/animation'
 *
 * // Animate elements with stagger
 * fromTo(elements, { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, progress, {
 *   ease: 'easeOutCubic',
 *   stagger: 0.1,
 *   render: (el, values) => {
 *     el.style.opacity = values.opacity
 *     el.style.transform = `translateY(${values.y}px)`
 *   }
 * })
 * ```
 */

import { type EasingName, easings } from './easings'
import { clamp, mapRange } from './math'

// Re-export for convenience
export { type EasingName, easings } from './easings'
export { clamp, lerp, mapRange, modulo, truncate } from './math'
export { batch, measure, mutate } from './raf'
export { desktopVH, desktopVW, mobileVH, mobileVW } from './viewport'

/**
 * Calculates staggered progress for an element in a sequence.
 *
 * Use this to create wave/cascade effects where elements animate sequentially.
 *
 * @param index - Element index in the sequence (0-based)
 * @param total - Total number of elements
 * @param progress - Overall animation progress (0-1)
 * @param staggerAmount - Delay between elements (0-1, typically 0.05-0.2)
 * @returns Individual element progress (0-1)
 *
 * @example
 * ```ts
 * // 5 elements with 0.1 stagger
 * // At progress 0.3:
 * // - Element 0: fully visible
 * // - Element 2: starting to show
 * // - Element 4: not yet visible
 *
 * elements.forEach((el, i) => {
 *   const elementProgress = stagger(i, elements.length, scrollProgress, 0.1)
 *   el.style.opacity = elementProgress
 * })
 * ```
 */
export function stagger(
  index: number,
  total: number,
  progress: number,
  staggerAmount: number
): number {
  const start = index * staggerAmount
  const end = 1 - (total - index) * staggerAmount
  return clamp(0, mapRange(start, end, progress, 0, 1), 1)
}

/**
 * Applies an easing function to a progress value.
 *
 * @param progress - Linear progress (0-1)
 * @param easeName - Name of the easing function
 * @returns Eased progress value
 *
 * @example
 * ```ts
 * const linear = 0.5
 * const eased = ease(linear, 'easeOutCubic') // ~0.875
 * ```
 */
export function ease(progress: number, easeName: EasingName): number {
  return easings[easeName](progress)
}

/** Options for the fromTo animation helper */
export interface FromToOptions {
  /** Easing function name (default: 'linear') */
  ease?: EasingName
  /** Stagger amount between elements (default: 0) */
  stagger?: number
  /** Render callback for each element */
  render?: (
    element: HTMLElement | number | Element,
    values: Record<string, number>
  ) => void
}

/** Value type for fromTo - can be a number or a function returning a number */
export type FromToValue =
  | number
  | Record<string, number | ((index: number) => number)>

/**
 * Animates elements from one state to another based on progress.
 *
 * This is a declarative animation helper - you provide the progress value
 * (from scroll, time, or any source) and it calculates interpolated values.
 *
 * @param entries - Element(s) to animate, or numbers for calculations only
 * @param from - Starting values (number or object of values)
 * @param to - Ending values (number or object of values)
 * @param progress - Animation progress (0-1)
 * @param options - Animation options (ease, stagger, render)
 *
 * @example
 * ```ts
 * // Simple opacity animation
 * fromTo(element, 0, 1, scrollProgress, {
 *   ease: 'easeOutCubic',
 *   render: (el, { value }) => {
 *     el.style.opacity = value
 *   }
 * })
 *
 * // Multiple properties with stagger
 * fromTo(
 *   elements,
 *   { opacity: 0, y: 50, scale: 0.9 },
 *   { opacity: 1, y: 0, scale: 1 },
 *   progress,
 *   {
 *     ease: 'easeOutQuart',
 *     stagger: 0.08,
 *     render: (el, { opacity, y, scale }) => {
 *       el.style.opacity = opacity
 *       el.style.transform = `translateY(${y}px) scale(${scale})`
 *     }
 *   }
 * )
 *
 * // Dynamic values based on index
 * fromTo(
 *   elements,
 *   { rotation: (i) => i * 10 },
 *   { rotation: (i) => i * 10 + 360 },
 *   progress,
 *   {
 *     render: (el, { rotation }) => {
 *       el.style.transform = `rotate(${rotation}deg)`
 *     }
 *   }
 * )
 * ```
 */
export function fromTo(
  entries:
    | number
    | (number | HTMLElement | null | Element | undefined)[]
    | HTMLElement
    | Element
    | null
    | undefined,
  from: FromToValue = 0,
  to: FromToValue = 1,
  progress = 0,
  options: FromToOptions = {}
): void {
  if (!entries) return

  const {
    stagger: staggerAmount = 0,
    ease: easeName = 'linear',
    render,
  } = options
  const keys = typeof from === 'object' ? Object.keys(from) : ['value']
  const elements = Array.isArray(entries) ? entries : [entries]

  for (const [index, element] of elements.entries()) {
    const staggeredProgress = stagger(
      index,
      elements.length,
      progress,
      staggerAmount
    )

    const easedProgress = ease(staggeredProgress, easeName)

    const values = Object.fromEntries(
      keys.map((key) => {
        const fromPreValue = typeof from === 'object' ? from[key] : from
        const toPreValue = typeof to === 'object' ? to[key] : to

        const fromValue =
          typeof fromPreValue === 'function'
            ? fromPreValue(index)
            : fromPreValue
        const toValue =
          typeof toPreValue === 'function' ? toPreValue(index) : toPreValue

        return [
          key,
          mapRange(0, 1, easedProgress, fromValue ?? 0, toValue ?? 0),
        ]
      })
    )

    if (render && element) render(element, values)
  }
}

/**
 * Creates a spring-based animation value.
 *
 * For CSS springs, use the Motion MCP tool instead.
 * This is for JavaScript-driven spring animations.
 *
 * @param current - Current value
 * @param target - Target value
 * @param velocity - Current velocity (mutated)
 * @param stiffness - Spring stiffness (higher = faster)
 * @param damping - Damping ratio (higher = less bounce)
 * @param deltaTime - Time step in seconds
 * @returns New value and velocity
 *
 * @example
 * ```ts
 * let position = 0
 * let velocity = 0
 * const target = 100
 *
 * function animate() {
 *   const result = spring(position, target, velocity, 200, 20, 1/60)
 *   position = result.value
 *   velocity = result.velocity
 *
 *   element.style.transform = `translateX(${position}px)`
 *
 *   if (Math.abs(target - position) > 0.01 || Math.abs(velocity) > 0.01) {
 *     requestAnimationFrame(animate)
 *   }
 * }
 * ```
 */
export function spring(
  current: number,
  target: number,
  velocity: number,
  stiffness = 200,
  damping = 20,
  deltaTime = 1 / 60
): { value: number; velocity: number } {
  const displacement = current - target
  const springForce = -stiffness * displacement
  const dampingForce = -damping * velocity
  const acceleration = springForce + dampingForce

  const newVelocity = velocity + acceleration * deltaTime
  const newValue = current + newVelocity * deltaTime

  return { value: newValue, velocity: newVelocity }
}
