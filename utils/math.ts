/**
 * Math Utilities
 *
 * Pure mathematical functions with no side effects.
 * These are the building blocks for animations, layouts, and data transformations.
 *
 * @example
 * ```ts
 * import { clamp, lerp, mapRange } from '@/utils/math'
 *
 * // Constrain a value
 * const bounded = clamp(0, value, 100)
 *
 * // Interpolate between values
 * const mid = lerp(0, 100, 0.5) // 50
 *
 * // Map scroll position to opacity
 * const opacity = mapRange(0, 500, scrollY, 0, 1, true)
 * ```
 */

/**
 * Constrains a value between a minimum and maximum.
 *
 * @param min - Lower bound
 * @param input - Value to constrain
 * @param max - Upper bound
 * @returns The clamped value
 *
 * @example
 * ```ts
 * clamp(0, -5, 100)  // 0
 * clamp(0, 50, 100)  // 50
 * clamp(0, 150, 100) // 100
 * ```
 */
export function clamp(min: number, input: number, max: number): number {
  return Math.max(min, Math.min(input, max))
}

/**
 * Linear interpolation between two values.
 *
 * @param start - Starting value
 * @param end - Ending value
 * @param amount - Interpolation factor (0 = start, 1 = end)
 * @returns The interpolated value
 *
 * @example
 * ```ts
 * lerp(0, 100, 0)    // 0
 * lerp(0, 100, 0.5)  // 50
 * lerp(0, 100, 1)    // 100
 * lerp(0, 100, 0.25) // 25
 * ```
 */
export function lerp(start: number, end: number, amount: number): number {
  return (1 - amount) * start + amount * end
}

/**
 * Maps a value from one range to another.
 *
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param input - Value to map
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @param shouldClamp - Whether to clamp output to range (default: false)
 * @returns The mapped value
 *
 * @example
 * ```ts
 * // Map scroll (0-1000) to opacity (0-1)
 * mapRange(0, 1000, 500, 0, 1) // 0.5
 *
 * // Map with clamping (won't exceed bounds)
 * mapRange(0, 100, 150, 0, 1, true) // 1
 *
 * // Inverted ranges work too
 * mapRange(0, 100, 50, 1, 0) // 0.5
 * ```
 */
export function mapRange(
  inMin: number,
  inMax: number,
  input: number,
  outMin: number,
  outMax: number,
  shouldClamp = false
): number {
  const result =
    ((input - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin

  if (!shouldClamp) return result

  const isInverted = outMin > outMax
  return isInverted
    ? clamp(outMax, result, outMin)
    : clamp(outMin, result, outMax)
}

/**
 * Truncates a number to a specified number of decimal places.
 *
 * @param value - Number to truncate
 * @param decimals - Number of decimal places
 * @returns The truncated number
 *
 * @example
 * ```ts
 * truncate(3.14159, 2) // 3.14
 * truncate(3.14159, 0) // 3
 * ```
 */
export function truncate(value: number, decimals: number): number {
  return Number.parseFloat(value.toFixed(decimals))
}

/**
 * True modulo operation (handles negative numbers correctly).
 *
 * JavaScript's % operator is remainder, not modulo.
 * This function returns a value in [0, d) for positive divisors.
 *
 * @param n - Dividend
 * @param d - Divisor (must be positive)
 * @returns The modulo result
 *
 * @example
 * ```ts
 * // JavaScript remainder vs true modulo
 * -1 % 3        // -1 (remainder)
 * modulo(-1, 3) // 2  (modulo)
 *
 * // Useful for wrapping array indices
 * modulo(index - 1, array.length)
 * ```
 */
export function modulo(n: number, d: number): number {
  if (d === 0) return n
  if (d < 0) return Number.NaN
  return ((n % d) + d) % d
}

/**
 * Rounds a number to the nearest multiple.
 *
 * @param value - Number to round
 * @param multiple - Multiple to round to
 * @returns The rounded value
 *
 * @example
 * ```ts
 * roundTo(23, 10)  // 20
 * roundTo(27, 10)  // 30
 * roundTo(0.23, 0.1) // 0.2
 * ```
 */
export function roundTo(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple
}

/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 *
 * @example
 * ```ts
 * degToRad(180) // Math.PI
 * degToRad(90)  // Math.PI / 2
 * ```
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Converts radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 *
 * @example
 * ```ts
 * radToDeg(Math.PI)     // 180
 * radToDeg(Math.PI / 2) // 90
 * ```
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

/**
 * Calculates the distance between two 2D points.
 *
 * @param x1 - First point X
 * @param y1 - First point Y
 * @param x2 - Second point X
 * @param y2 - Second point Y
 * @returns The distance
 *
 * @example
 * ```ts
 * distance(0, 0, 3, 4) // 5
 * ```
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * Normalizes a value to a 0-1 range.
 *
 * @param min - Range minimum
 * @param max - Range maximum
 * @param value - Value to normalize
 * @returns Normalized value (0-1)
 *
 * @example
 * ```ts
 * normalize(0, 100, 50)  // 0.5
 * normalize(0, 100, 0)   // 0
 * normalize(0, 100, 100) // 1
 * ```
 */
export function normalize(min: number, max: number, value: number): number {
  return (value - min) / (max - min)
}
