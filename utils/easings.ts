/**
 * Easing Functions
 *
 * A complete collection of easing curves for animations.
 * All functions take a progress value (0-1) and return an eased value (0-1).
 *
 * @see https://easings.net for visual references
 *
 * @example
 * ```ts
 * import { easings, type EasingName } from '@/utils/easings'
 *
 * // Direct usage
 * const eased = easings.easeOutCubic(0.5)
 *
 * // With a variable easing name
 * const easingName: EasingName = 'easeInOutQuart'
 * const value = easings[easingName](progress)
 * ```
 *
 * ## Choosing an Easing
 *
 * | Category | Use Case |
 * |----------|----------|
 * | `easeOut*` | UI feedback, appearing elements (most common) |
 * | `easeIn*` | Exiting elements, building tension |
 * | `easeInOut*` | State transitions, loading indicators |
 * | `*Cubic/Quart` | Natural, balanced motion |
 * | `*Expo` | Dramatic, snappy motion |
 * | `*Elastic/Bounce` | Playful, attention-grabbing |
 */

const pow = Math.pow
const sqrt = Math.sqrt
const sin = Math.sin
const cos = Math.cos
const PI = Math.PI

// Easing constants
const c1 = 1.70158
const c2 = c1 * 1.525
const c3 = c1 + 1
const c4 = (2 * PI) / 3
const c5 = (2 * PI) / 4.5

/** Bounce out helper (used by bounce easings) */
const bounceOut = (x: number): number => {
  const n1 = 7.5625
  const d1 = 2.75

  if (x < 1 / d1) {
    return n1 * x * x
  }
  if (x < 2 / d1) {
    return n1 * (x - 1.5 / d1) * x + 0.75
  }
  if (x < 2.5 / d1) {
    return n1 * (x - 2.25 / d1) * x + 0.9375
  }
  return n1 * (x - 2.625 / d1) * x + 0.984375
}

/**
 * Collection of easing functions.
 * Each function takes progress (0-1) and returns eased value (0-1).
 */
export const easings = {
  // ─────────────────────────────────────────────────────────────────────────────
  // Linear (no easing)
  // ─────────────────────────────────────────────────────────────────────────────

  /** No easing - constant speed */
  linear: (x: number): number => x,

  // ─────────────────────────────────────────────────────────────────────────────
  // Quadratic (power of 2)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Slow start */
  easeInQuad: (x: number): number => x * x,

  /** Slow end */
  easeOutQuad: (x: number): number => 1 - (1 - x) * (1 - x),

  /** Slow start and end */
  easeInOutQuad: (x: number): number =>
    x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2,

  // ─────────────────────────────────────────────────────────────────────────────
  // Cubic (power of 3) - Most commonly used
  // ─────────────────────────────────────────────────────────────────────────────

  /** Slow start, natural feel */
  easeInCubic: (x: number): number => x * x * x,

  /** Slow end, natural feel - great for UI interactions */
  easeOutCubic: (x: number): number => 1 - pow(1 - x, 3),

  /** Smooth start and end - great for transitions */
  easeInOutCubic: (x: number): number =>
    x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2,

  // ─────────────────────────────────────────────────────────────────────────────
  // Quartic (power of 4)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Slower start than cubic */
  easeInQuart: (x: number): number => x * x * x * x,

  /** Slower end than cubic */
  easeOutQuart: (x: number): number => 1 - pow(1 - x, 4),

  /** More pronounced ease than cubic */
  easeInOutQuart: (x: number): number =>
    x < 0.5 ? 8 * x * x * x * x : 1 - pow(-2 * x + 2, 4) / 2,

  // ─────────────────────────────────────────────────────────────────────────────
  // Quintic (power of 5)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Very slow start */
  easeInQuint: (x: number): number => x * x * x * x * x,

  /** Very slow end */
  easeOutQuint: (x: number): number => 1 - pow(1 - x, 5),

  /** Very pronounced ease */
  easeInOutQuint: (x: number): number =>
    x < 0.5 ? 16 * x * x * x * x * x : 1 - pow(-2 * x + 2, 5) / 2,

  // ─────────────────────────────────────────────────────────────────────────────
  // Sinusoidal - Gentle, wave-like
  // ─────────────────────────────────────────────────────────────────────────────

  /** Gentle slow start */
  easeInSine: (x: number): number => 1 - cos((x * PI) / 2),

  /** Gentle slow end */
  easeOutSine: (x: number): number => sin((x * PI) / 2),

  /** Gentle ease both ends */
  easeInOutSine: (x: number): number => -(cos(PI * x) - 1) / 2,

  // ─────────────────────────────────────────────────────────────────────────────
  // Exponential - Dramatic, snappy
  // ─────────────────────────────────────────────────────────────────────────────

  /** Dramatic slow start - almost stationary then fast */
  easeInExpo: (x: number): number => (x === 0 ? 0 : pow(2, 10 * x - 10)),

  /** Dramatic slow end - fast then almost stops */
  easeOutExpo: (x: number): number => (x === 1 ? 1 : 1 - pow(2, -10 * x)),

  /** Dramatic both ends */
  easeInOutExpo: (x: number): number => {
    if (x === 0) return 0
    if (x === 1) return 1
    if (x < 0.5) return pow(2, 20 * x - 10) / 2
    return (2 - pow(2, -20 * x + 10)) / 2
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Circular - Based on circle quarter
  // ─────────────────────────────────────────────────────────────────────────────

  /** Circular slow start */
  easeInCirc: (x: number): number => 1 - sqrt(1 - pow(x, 2)),

  /** Circular slow end */
  easeOutCirc: (x: number): number => sqrt(1 - pow(x - 1, 2)),

  /** Circular both ends */
  easeInOutCirc: (x: number): number =>
    x < 0.5
      ? (1 - sqrt(1 - pow(2 * x, 2))) / 2
      : (sqrt(1 - pow(-2 * x + 2, 2)) + 1) / 2,

  // ─────────────────────────────────────────────────────────────────────────────
  // Back - Overshoots then returns
  // ─────────────────────────────────────────────────────────────────────────────

  /** Pulls back before accelerating */
  easeInBack: (x: number): number => c3 * x * x * x - c1 * x * x,

  /** Overshoots target then settles */
  easeOutBack: (x: number): number =>
    1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2),

  /** Pulls back, overshoots, settles */
  easeInOutBack: (x: number): number =>
    x < 0.5
      ? (pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2,

  // ─────────────────────────────────────────────────────────────────────────────
  // Elastic - Spring-like oscillation
  // ─────────────────────────────────────────────────────────────────────────────

  /** Wobbles at start */
  easeInElastic: (x: number): number => {
    if (x === 0) return 0
    if (x === 1) return 1
    return -pow(2, 10 * x - 10) * sin((x * 10 - 10.75) * c4)
  },

  /** Wobbles at end - great for attention */
  easeOutElastic: (x: number): number => {
    if (x === 0) return 0
    if (x === 1) return 1
    return pow(2, -10 * x) * sin((x * 10 - 0.75) * c4) + 1
  },

  /** Wobbles both ends */
  easeInOutElastic: (x: number): number => {
    if (x === 0) return 0
    if (x === 1) return 1
    if (x < 0.5) return -(pow(2, 20 * x - 10) * sin((20 * x - 11.125) * c5)) / 2
    return (pow(2, -20 * x + 10) * sin((20 * x - 11.125) * c5)) / 2 + 1
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Bounce - Ball bouncing effect
  // ─────────────────────────────────────────────────────────────────────────────

  /** Bounces at start */
  easeInBounce: (x: number): number => 1 - bounceOut(1 - x),

  /** Bounces at end - like a ball settling */
  easeOutBounce: bounceOut,

  /** Bounces both ends */
  easeInOutBounce: (x: number): number =>
    x < 0.5 ? (1 - bounceOut(1 - 2 * x)) / 2 : (1 + bounceOut(2 * x - 1)) / 2,
} as const

/** All available easing function names */
export type EasingName = keyof typeof easings

/** An easing function signature */
export type EasingFunction = (progress: number) => number
