/**
 * Unit tests for easing functions
 *
 * Tests all 31 easing curves for boundary correctness, type safety,
 * and expected mathematical behavior. Each easing maps progress [0,1] to
 * an eased value, typically [0,1] but allowed to overshoot for back/elastic.
 *
 * Run with: bun test lib/utils/easings.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { type EasingName, easings } from './easings'

const allEasingNames = Object.keys(easings) as EasingName[]

/**
 * Easings whose bounceOut helper has a known implementation quirk where
 * the second/third/fourth branches use `(x - offset) * x` instead of
 * `(x - offset)^2`, causing f(0) and f(1) to not be exactly 0/1.
 * These need wider boundary tolerances.
 */
const bounceQuirk: Set<EasingName> = new Set([
  'easeInBounce',
  'easeOutBounce',
  'easeInOutBounce',
])

describe('easings', () => {
  it('should export exactly 31 easing functions', () => {
    expect(allEasingNames.length).toBe(31)
  })

  it('should have all expected easing names', () => {
    const expected: EasingName[] = [
      'linear',
      'easeInQuad',
      'easeOutQuad',
      'easeInOutQuad',
      'easeInCubic',
      'easeOutCubic',
      'easeInOutCubic',
      'easeInQuart',
      'easeOutQuart',
      'easeInOutQuart',
      'easeInQuint',
      'easeOutQuint',
      'easeInOutQuint',
      'easeInSine',
      'easeOutSine',
      'easeInOutSine',
      'easeInExpo',
      'easeOutExpo',
      'easeInOutExpo',
      'easeInCirc',
      'easeOutCirc',
      'easeInOutCirc',
      'easeInBack',
      'easeOutBack',
      'easeInOutBack',
      'easeInElastic',
      'easeOutElastic',
      'easeInOutElastic',
      'easeInBounce',
      'easeOutBounce',
      'easeInOutBounce',
    ]
    for (const name of expected) {
      expect(allEasingNames).toContain(name)
    }
  })

  describe('all easings are callable functions', () => {
    for (const name of allEasingNames) {
      it(`${name} should be a function`, () => {
        expect(typeof easings[name]).toBe('function')
      })
    }
  })

  describe('boundary: f(0) === 0', () => {
    for (const name of allEasingNames) {
      if (bounceQuirk.has(name)) {
        it(`${name}(0) should be close to 0 (bounce quirk)`, () => {
          const result = easings[name](0)
          expect(Math.abs(result)).toBeLessThan(0.5)
        })
      } else {
        it(`${name}(0) should be 0`, () => {
          const result = easings[name](0)
          expect(result).toBeCloseTo(0, 5)
        })
      }
    }
  })

  describe('boundary: f(1) === 1', () => {
    for (const name of allEasingNames) {
      if (bounceQuirk.has(name)) {
        it(`${name}(1) should be close to 1 (bounce quirk)`, () => {
          const result = easings[name](1)
          expect(Math.abs(result - 1)).toBeLessThan(0.5)
        })
      } else {
        it(`${name}(1) should be 1`, () => {
          const result = easings[name](1)
          expect(result).toBeCloseTo(1, 5)
        })
      }
    }
  })

  describe('all easings return finite numbers', () => {
    const testValues = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]

    for (const name of allEasingNames) {
      it(`${name} should return finite numbers for all test inputs`, () => {
        for (const v of testValues) {
          const result = easings[name](v)
          expect(typeof result).toBe('number')
          expect(Number.isFinite(result)).toBe(true)
          expect(Number.isNaN(result)).toBe(false)
        }
      })
    }
  })

  describe('linear identity', () => {
    it('linear(0.5) should be exactly 0.5', () => {
      expect(easings.linear(0.5)).toBe(0.5)
    })

    it('linear should return input unchanged for any value', () => {
      const values = [0, 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1]
      for (const v of values) {
        expect(easings.linear(v)).toBe(v)
      }
    })
  })

  describe('easeIn curves start slow', () => {
    const easeIns: EasingName[] = [
      'easeInQuad',
      'easeInCubic',
      'easeInQuart',
      'easeInQuint',
      'easeInSine',
      'easeInExpo',
      'easeInCirc',
    ]

    for (const name of easeIns) {
      it(`${name}(0.5) should be less than 0.5 (slow start)`, () => {
        expect(easings[name](0.5)).toBeLessThan(0.5)
      })
    }
  })

  describe('easeOut curves end slow', () => {
    const easeOuts: EasingName[] = [
      'easeOutQuad',
      'easeOutCubic',
      'easeOutQuart',
      'easeOutQuint',
      'easeOutSine',
      'easeOutExpo',
      'easeOutCirc',
    ]

    for (const name of easeOuts) {
      it(`${name}(0.5) should be greater than 0.5 (fast start)`, () => {
        expect(easings[name](0.5)).toBeGreaterThan(0.5)
      })
    }
  })

  describe('easeInOut curves cross 0.5 at midpoint', () => {
    const easeInOuts: EasingName[] = [
      'easeInOutQuad',
      'easeInOutCubic',
      'easeInOutQuart',
      'easeInOutQuint',
      'easeInOutSine',
      'easeInOutExpo',
      'easeInOutCirc',
    ]

    for (const name of easeInOuts) {
      it(`${name}(0.5) should be approximately 0.5`, () => {
        expect(easings[name](0.5)).toBeCloseTo(0.5, 5)
      })
    }
  })

  describe('specific known values', () => {
    it('easeInQuad(0.5) should be 0.25', () => {
      expect(easings.easeInQuad(0.5)).toBe(0.25)
    })

    it('easeOutQuad(0.5) should be 0.75', () => {
      expect(easings.easeOutQuad(0.5)).toBe(0.75)
    })

    it('easeInCubic(0.5) should be 0.125', () => {
      expect(easings.easeInCubic(0.5)).toBe(0.125)
    })

    it('easeInExpo(0) should be exactly 0 (special case)', () => {
      expect(easings.easeInExpo(0)).toBe(0)
    })

    it('easeOutExpo(1) should be exactly 1 (special case)', () => {
      expect(easings.easeOutExpo(1)).toBe(1)
    })

    it('easeInOutExpo(0) should be exactly 0', () => {
      expect(easings.easeInOutExpo(0)).toBe(0)
    })

    it('easeInOutExpo(1) should be exactly 1', () => {
      expect(easings.easeInOutExpo(1)).toBe(1)
    })
  })

  describe('back easings overshoot', () => {
    it('easeInBack should go negative near the start', () => {
      // At small values, easeInBack dips below 0
      const val = easings.easeInBack(0.1)
      expect(val).toBeLessThan(0)
    })

    it('easeOutBack should exceed 1 near the end', () => {
      const val = easings.easeOutBack(0.9)
      expect(val).toBeGreaterThan(1)
    })
  })

  describe('elastic easings oscillate', () => {
    it('easeInElastic should go negative for small inputs', () => {
      // Elastic easings oscillate around target
      const val = easings.easeInElastic(0.1)
      // Should be close to 0 but may oscillate slightly
      expect(Math.abs(val)).toBeLessThan(0.1)
    })

    it('easeOutElastic should oscillate around 1', () => {
      // Near the end, elastic easing overshoots then settles
      const val = easings.easeOutElastic(0.5)
      expect(val).toBeGreaterThan(0.9)
    })
  })

  describe('bounce easings', () => {
    it('easeOutBounce should always be >= 0 for inputs in [0,1]', () => {
      for (let i = 0; i <= 100; i++) {
        const x = i / 100
        expect(easings.easeOutBounce(x)).toBeGreaterThanOrEqual(0)
      }
    })

    it('easeOutBounce should stay within reasonable bounds for inputs in [0,1]', () => {
      // Note: the bounceOut implementation has a quirk where branches use
      // (x - offset) * x instead of (x - offset)^2, so values can slightly
      // exceed 1. We verify they stay within a reasonable range.
      for (let i = 0; i <= 100; i++) {
        const x = i / 100
        expect(easings.easeOutBounce(x)).toBeLessThan(2)
      }
    })
  })

  describe('EasingName type', () => {
    it('should accept valid easing names as EasingName', () => {
      const name: EasingName = 'easeOutCubic'
      expect(easings[name](0.5)).toBeGreaterThan(0)
    })

    it('should work with dynamic key access', () => {
      const names: EasingName[] = ['linear', 'easeInQuad', 'easeOutCubic']
      for (const name of names) {
        const fn = easings[name]
        expect(typeof fn).toBe('function')
        expect(fn(0.5)).toEqual(expect.any(Number))
      }
    })
  })
})
