/**
 * Unit tests for math utilities
 *
 * Run with: bun test lib/utils/math.test.ts
 */

import { describe, expect, it } from 'bun:test'
import {
  clamp,
  degToRad,
  distance,
  lerp,
  mapRange,
  modulo,
  normalize,
  radToDeg,
  roundTo,
  truncate,
} from './math'

describe('clamp', () => {
  it('should return input when within bounds', () => {
    expect(clamp(0, 50, 100)).toBe(50)
    expect(clamp(-10, 0, 10)).toBe(0)
  })

  it('should return min when input is below min', () => {
    expect(clamp(0, -5, 100)).toBe(0)
    expect(clamp(10, 5, 20)).toBe(10)
  })

  it('should return max when input is above max', () => {
    expect(clamp(0, 150, 100)).toBe(100)
    expect(clamp(10, 25, 20)).toBe(20)
  })

  it('should handle edge cases', () => {
    expect(clamp(0, 0, 100)).toBe(0)
    expect(clamp(0, 100, 100)).toBe(100)
  })
})

describe('lerp', () => {
  it('should return start when amount is 0', () => {
    expect(lerp(0, 100, 0)).toBe(0)
    expect(lerp(-50, 50, 0)).toBe(-50)
  })

  it('should return end when amount is 1', () => {
    expect(lerp(0, 100, 1)).toBe(100)
    expect(lerp(-50, 50, 1)).toBe(50)
  })

  it('should return midpoint when amount is 0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
    expect(lerp(-100, 100, 0.5)).toBe(0)
  })

  it('should handle intermediate values', () => {
    expect(lerp(0, 100, 0.25)).toBe(25)
    expect(lerp(0, 100, 0.75)).toBe(75)
  })

  it('should extrapolate beyond 0-1 range', () => {
    expect(lerp(0, 100, 1.5)).toBe(150)
    expect(lerp(0, 100, -0.5)).toBe(-50)
  })
})

describe('mapRange', () => {
  it('should map value from one range to another', () => {
    expect(mapRange(0, 100, 50, 0, 1)).toBe(0.5)
    expect(mapRange(0, 1000, 500, 0, 1)).toBe(0.5)
  })

  it('should handle inverted output ranges', () => {
    expect(mapRange(0, 100, 50, 1, 0)).toBe(0.5)
    expect(mapRange(0, 100, 0, 1, 0)).toBe(1)
    expect(mapRange(0, 100, 100, 1, 0)).toBe(0)
  })

  it('should not clamp by default', () => {
    expect(mapRange(0, 100, 150, 0, 1)).toBe(1.5)
    expect(mapRange(0, 100, -50, 0, 1)).toBe(-0.5)
  })

  it('should clamp when shouldClamp is true', () => {
    expect(mapRange(0, 100, 150, 0, 1, true)).toBe(1)
    expect(mapRange(0, 100, -50, 0, 1, true)).toBe(0)
  })

  it('should clamp inverted ranges correctly', () => {
    expect(mapRange(0, 100, 150, 1, 0, true)).toBe(0)
    expect(mapRange(0, 100, -50, 1, 0, true)).toBe(1)
  })
})

describe('truncate', () => {
  it('should truncate to specified decimal places', () => {
    expect(truncate(1.23456789, 2)).toBe(1.23)
    expect(truncate(1.23456789, 3)).toBe(1.235)
    expect(truncate(1.23456789, 4)).toBe(1.2346)
  })

  it('should handle 0 decimal places', () => {
    expect(truncate(1.23456789, 0)).toBe(1)
    expect(truncate(3.9, 0)).toBe(4)
  })

  it('should handle already truncated numbers', () => {
    expect(truncate(3.14, 2)).toBe(3.14)
    expect(truncate(5, 2)).toBe(5)
  })
})

describe('modulo', () => {
  it('should work like JavaScript % for positive numbers', () => {
    expect(modulo(5, 3)).toBe(2)
    expect(modulo(10, 4)).toBe(2)
  })

  it('should handle negative dividends correctly (true modulo)', () => {
    expect(modulo(-1, 3)).toBe(2)
    expect(modulo(-5, 3)).toBe(1)
    expect(modulo(-10, 4)).toBe(2)
  })

  it('should return input when divisor is 0', () => {
    expect(modulo(5, 0)).toBe(5)
    expect(modulo(-5, 0)).toBe(-5)
  })

  it('should return NaN for negative divisors', () => {
    expect(modulo(5, -3)).toBeNaN()
  })

  it('should wrap array indices correctly', () => {
    const length = 5
    expect(modulo(-1, length)).toBe(4)
    expect(modulo(5, length)).toBe(0)
    expect(modulo(7, length)).toBe(2)
  })
})

describe('roundTo', () => {
  it('should round to the nearest multiple', () => {
    expect(roundTo(23, 10)).toBe(20)
    expect(roundTo(27, 10)).toBe(30)
    expect(roundTo(25, 10)).toBe(30)
  })

  it('should handle decimal multiples', () => {
    expect(roundTo(0.23, 0.1)).toBeCloseTo(0.2, 10)
    expect(roundTo(0.27, 0.1)).toBeCloseTo(0.3, 10)
  })

  it('should handle exact multiples', () => {
    expect(roundTo(20, 10)).toBe(20)
    expect(roundTo(0.5, 0.5)).toBe(0.5)
  })
})

describe('degToRad', () => {
  it('should convert degrees to radians', () => {
    expect(degToRad(0)).toBe(0)
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10)
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10)
    expect(degToRad(360)).toBeCloseTo(Math.PI * 2, 10)
  })

  it('should handle negative degrees', () => {
    expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2, 10)
  })
})

describe('radToDeg', () => {
  it('should convert radians to degrees', () => {
    expect(radToDeg(0)).toBe(0)
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 10)
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 10)
    expect(radToDeg(Math.PI * 2)).toBeCloseTo(360, 10)
  })

  it('should handle negative radians', () => {
    expect(radToDeg(-Math.PI / 2)).toBeCloseTo(-90, 10)
  })
})

describe('distance', () => {
  it('should calculate distance between two points', () => {
    expect(distance(0, 0, 3, 4)).toBe(5)
    expect(distance(0, 0, 0, 0)).toBe(0)
  })

  it('should handle negative coordinates', () => {
    expect(distance(-3, -4, 0, 0)).toBe(5)
    expect(distance(-1, -1, 1, 1)).toBeCloseTo(Math.sqrt(8), 10)
  })

  it('should be symmetric', () => {
    expect(distance(0, 0, 3, 4)).toBe(distance(3, 4, 0, 0))
  })
})

describe('normalize', () => {
  it('should normalize value to 0-1 range', () => {
    expect(normalize(0, 100, 50)).toBe(0.5)
    expect(normalize(0, 100, 0)).toBe(0)
    expect(normalize(0, 100, 100)).toBe(1)
  })

  it('should handle non-zero min values', () => {
    expect(normalize(50, 100, 75)).toBe(0.5)
    expect(normalize(-100, 100, 0)).toBe(0.5)
  })

  it('should extrapolate outside range', () => {
    expect(normalize(0, 100, 150)).toBe(1.5)
    expect(normalize(0, 100, -50)).toBe(-0.5)
  })
})
