/** Argument order is `(min, input, max)`, not `(input, min, max)`. */
export function clamp(min: number, input: number, max: number): number {
  return Math.max(min, Math.min(input, max))
}

/** `amount` 0 returns `start`, 1 returns `end`; not clamped. */
export function lerp(start: number, end: number, amount: number): number {
  return (1 - amount) * start + amount * end
}

/** Maps `input` from `[inMin, inMax]` to `[outMin, outMax]`; an inverted output range is allowed. */
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

export function truncate(value: number, decimals: number): number {
  return Number.parseFloat(value.toFixed(decimals))
}

/** True modulo: `modulo(-1, 3)` is 2, where `%` gives -1. Returns `n` for `d === 0` and NaN for `d < 0`. */
export function modulo(n: number, d: number): number {
  if (d === 0) return n
  if (d < 0) return Number.NaN
  return ((n % d) + d) % d
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}
