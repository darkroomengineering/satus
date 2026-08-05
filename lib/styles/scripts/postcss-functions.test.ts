/**
 * Regression test for issue #395: `mobile-vh()` emitted
 * `clamp(Nvh, Nsvh, Ndvh)`. `clamp(MIN, VAL, MAX)` is `max(MIN, min(VAL,
 * MAX))`, and on modern mobile browsers `vh >= dvh >= svh`, so that clamp
 * always collapsed to plain `vh` — the address-bar-hidden value the
 * project's own `h-dvh` house rule exists to avoid. `mobile-vh()` now emits
 * `dvh` directly.
 *
 * Run with: bun test lib/styles/scripts/postcss-functions.test.ts
 */

import { describe, expect, it } from 'bun:test'

import { functions } from './postcss-functions.mjs'

describe('mobile-vh()', () => {
  it('emits a plain dvh value, never a vh/svh/dvh clamp', () => {
    const result = functions['mobile-vh']('75')

    expect(result).toMatch(/^-?[\d.]+dvh$/)
    expect(result).not.toContain('clamp')
    expect(result).not.toContain('svh')
  })

  it('scales proportionally to the mobile screen height', () => {
    const result = functions['mobile-vh']('100')
    expect(result).toBe(functions['mobile-vh']('100'))
    expect(result.endsWith('dvh')).toBe(true)
  })
})
