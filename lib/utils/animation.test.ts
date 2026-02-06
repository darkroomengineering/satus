/**
 * Unit tests for animation utilities
 *
 * Tests stagger, ease, spring, and fromTo -- the high-level animation helpers
 * that combine math, easings, and timing for declarative animations.
 *
 * Run with: bun test lib/utils/animation.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { ease, fromTo, spring, stagger } from './animation'

describe('stagger', () => {
  it('should return values in [0, 1] range', () => {
    for (let i = 0; i < 5; i++) {
      for (let p = 0; p <= 10; p++) {
        const result = stagger(i, 5, p / 10, 0.1)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(1)
      }
    }
  })

  it('should return 0 for all elements when progress is 0', () => {
    for (let i = 0; i < 5; i++) {
      expect(stagger(i, 5, 0, 0.1)).toBe(0)
    }
  })

  it('should return 1 for all elements when progress is 1', () => {
    for (let i = 0; i < 5; i++) {
      expect(stagger(i, 5, 1, 0.1)).toBe(1)
    }
  })

  it('should stagger elements so earlier indices progress faster', () => {
    const progress = 0.4
    const total = 5
    const staggerAmount = 0.1

    const results = Array.from({ length: total }, (_, i) =>
      stagger(i, total, progress, staggerAmount)
    )

    // Each element should have >= progress of the next element
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i]).toBeGreaterThanOrEqual(results[i + 1]!)
    }
  })

  it('should return identical values for all elements when staggerAmount is 0', () => {
    const progress = 0.5
    const total = 5

    const results = Array.from({ length: total }, (_, i) =>
      stagger(i, total, progress, 0)
    )

    for (const result of results) {
      expect(result).toBeCloseTo(results[0]!, 10)
    }
  })

  it('should handle single element', () => {
    expect(stagger(0, 1, 0, 0.1)).toBe(0)
    expect(stagger(0, 1, 0.5, 0.1)).toBeGreaterThan(0)
    expect(stagger(0, 1, 1, 0.1)).toBe(1)
  })

  it('should handle large stagger amounts gracefully', () => {
    // With large stagger, middle elements may not reach full progress
    const result = stagger(2, 5, 0.5, 0.3)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

describe('ease', () => {
  it('should delegate to the correct easing function', () => {
    // linear should pass through
    expect(ease(0.5, 'linear')).toBe(0.5)

    // easeInQuad(0.5) = 0.25
    expect(ease(0.5, 'easeInQuad')).toBe(0.25)

    // easeOutQuad(0.5) = 0.75
    expect(ease(0.5, 'easeOutQuad')).toBe(0.75)
  })

  it('should return 0 for progress 0 on all easings', () => {
    expect(ease(0, 'easeOutCubic')).toBe(0)
    expect(ease(0, 'easeInExpo')).toBe(0)
    expect(ease(0, 'easeInOutSine')).toBeCloseTo(0, 10)
  })

  it('should return 1 for progress 1 on all easings', () => {
    expect(ease(1, 'easeOutCubic')).toBe(1)
    expect(ease(1, 'easeOutExpo')).toBe(1)
    expect(ease(1, 'easeInOutQuart')).toBe(1)
  })

  it('should produce different results for different easings at same progress', () => {
    const linear = ease(0.3, 'linear')
    const quad = ease(0.3, 'easeInQuad')
    const cubic = ease(0.3, 'easeInCubic')

    // These should all differ
    expect(linear).not.toBe(quad)
    expect(quad).not.toBe(cubic)
  })
})

describe('spring', () => {
  it('should return an object with value and velocity', () => {
    const result = spring(0, 100, 0)
    expect(result).toHaveProperty('value')
    expect(result).toHaveProperty('velocity')
    expect(typeof result.value).toBe('number')
    expect(typeof result.velocity).toBe('number')
  })

  it('should move toward target from below', () => {
    const result = spring(0, 100, 0, 200, 20, 1 / 60)
    expect(result.value).toBeGreaterThan(0)
    expect(result.velocity).toBeGreaterThan(0)
  })

  it('should move toward target from above', () => {
    const result = spring(200, 100, 0, 200, 20, 1 / 60)
    expect(result.value).toBeLessThan(200)
    expect(result.velocity).toBeLessThan(0)
  })

  it('should converge toward target over many iterations', () => {
    let current = 0
    let velocity = 0
    const target = 100

    for (let i = 0; i < 300; i++) {
      const result = spring(current, target, velocity, 200, 20, 1 / 60)
      current = result.value
      velocity = result.velocity
    }

    expect(current).toBeCloseTo(target, 1)
    expect(Math.abs(velocity)).toBeLessThan(1)
  })

  it('should stay at target when already there with no velocity', () => {
    const result = spring(100, 100, 0, 200, 20, 1 / 60)
    expect(result.value).toBeCloseTo(100, 10)
    expect(result.velocity).toBeCloseTo(0, 10)
  })

  it('should use default parameter values', () => {
    // Uses default stiffness=200, damping=20, deltaTime=1/60
    const result = spring(0, 100, 0)
    expect(result.value).toBeGreaterThan(0)
  })

  it('should produce more oscillation with low damping', () => {
    let current = 0
    let velocity = 0
    const target = 100
    let overshootCount = 0

    for (let i = 0; i < 600; i++) {
      const result = spring(current, target, velocity, 200, 5, 1 / 60)
      const prev = current
      current = result.value
      velocity = result.velocity

      // Count how many times we cross the target
      if (
        (prev < target && current > target) ||
        (prev > target && current < target)
      ) {
        overshootCount++
      }
    }

    // Low damping should cause multiple oscillations (overshoots)
    expect(overshootCount).toBeGreaterThan(1)
  })

  it('should produce less oscillation with high damping', () => {
    let current = 0
    let velocity = 0
    const target = 100
    let overshootCount = 0

    for (let i = 0; i < 600; i++) {
      const result = spring(current, target, velocity, 200, 40, 1 / 60)
      const prev = current
      current = result.value
      velocity = result.velocity

      if (
        (prev < target && current > target) ||
        (prev > target && current < target)
      ) {
        overshootCount++
      }
    }

    // High damping: might overshoot once or not at all
    expect(overshootCount).toBeLessThanOrEqual(1)
  })
})

describe('fromTo', () => {
  it('should not throw when entries is null or undefined', () => {
    expect(() => fromTo(null, 0, 1, 0.5)).not.toThrow()
    expect(() => fromTo(undefined, 0, 1, 0.5)).not.toThrow()
  })

  it('should call render callback with interpolated values (numeric)', () => {
    const results: { element: unknown; values: Record<string, number> }[] = []

    fromTo([1, 2, 3], 0, 100, 0.5, {
      render: (element, values) => {
        results.push({ element, values })
      },
    })

    expect(results.length).toBe(3)
    // With linear easing and no stagger, all values should be at 50
    for (const r of results) {
      expect(r.values.value).toBeCloseTo(50, 5)
    }
  })

  it('should interpolate object properties', () => {
    const results: Record<string, number>[] = []

    fromTo([1], { opacity: 0, y: 50 }, { opacity: 1, y: 0 }, 0.5, {
      render: (_el, values) => {
        results.push(values)
      },
    })

    expect(results.length).toBe(1)
    expect(results[0]!.opacity).toBeCloseTo(0.5, 5)
    expect(results[0]!.y).toBeCloseTo(25, 5)
  })

  it('should apply easing to interpolation', () => {
    const linearResults: Record<string, number>[] = []
    const easedResults: Record<string, number>[] = []

    fromTo([1], 0, 100, 0.5, {
      ease: 'linear',
      render: (_el, values) => {
        linearResults.push(values)
      },
    })

    fromTo([1], 0, 100, 0.5, {
      ease: 'easeInQuad',
      render: (_el, values) => {
        easedResults.push(values)
      },
    })

    // easeInQuad(0.5) = 0.25, so value should be 25 not 50
    expect(linearResults[0]!.value).toBeCloseTo(50, 5)
    expect(easedResults[0]!.value).toBeCloseTo(25, 5)
  })

  it('should apply stagger to elements', () => {
    const results: { index: number; values: Record<string, number> }[] = []
    let idx = 0

    fromTo([1, 2, 3, 4, 5], 0, 100, 0.5, {
      stagger: 0.05,
      render: (_el, values) => {
        results.push({ index: idx++, values })
      },
    })

    expect(results.length).toBe(5)
    // With stagger, earlier elements should have higher progress
    expect(results[0]!.values.value).toBeGreaterThanOrEqual(
      results[4]!.values.value!
    )
  })

  it('should handle a single element (not in array)', () => {
    const results: Record<string, number>[] = []

    fromTo(42 as unknown as number, 0, 100, 0.5, {
      render: (_el, values) => {
        results.push(values)
      },
    })

    expect(results.length).toBe(1)
    expect(results[0]!.value).toBeCloseTo(50, 5)
  })

  it('should not call render when element is null in array', () => {
    const renderCalls: unknown[] = []

    fromTo([null, 1, undefined], 0, 100, 0.5, {
      render: (el, _values) => {
        renderCalls.push(el)
      },
    })

    // render should only be called for truthy elements
    expect(renderCalls.length).toBe(1)
    expect(renderCalls[0]!).toBe(1)
  })

  it('should handle progress 0 (start values)', () => {
    const results: Record<string, number>[] = []

    fromTo([1], { x: 10, y: 20 }, { x: 100, y: 200 }, 0, {
      render: (_el, values) => {
        results.push(values)
      },
    })

    expect(results[0]!.x).toBeCloseTo(10, 5)
    expect(results[0]!.y).toBeCloseTo(20, 5)
  })

  it('should handle progress 1 (end values)', () => {
    const results: Record<string, number>[] = []

    fromTo([1], { x: 10, y: 20 }, { x: 100, y: 200 }, 1, {
      render: (_el, values) => {
        results.push(values)
      },
    })

    expect(results[0]!.x).toBeCloseTo(100, 5)
    expect(results[0]!.y).toBeCloseTo(200, 5)
  })

  it('should support function values based on index', () => {
    const results: { index: number; values: Record<string, number> }[] = []
    let callIndex = 0

    fromTo(
      [1, 2, 3],
      { rotation: (i: number) => i * 10 },
      { rotation: (i: number) => i * 10 + 360 },
      1,
      {
        render: (_el, values) => {
          results.push({ index: callIndex++, values })
        },
      }
    )

    // At progress=1, rotation should be the "to" value for each index
    expect(results[0]!.values.rotation).toBeCloseTo(0 * 10 + 360, 1)
    expect(results[1]!.values.rotation).toBeCloseTo(1 * 10 + 360, 1)
    expect(results[2]!.values.rotation).toBeCloseTo(2 * 10 + 360, 1)
  })
})
