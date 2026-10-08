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

import { screens } from '../layout.mjs'
import { functions } from './postcss-functions.mjs'

describe('mobile-text() / desktop-text()', () => {
  // Resolves `calc(Arem + Bvw)` for a root font size and viewport width.
  function resolve(css: string, rootPx: number, viewport: number) {
    const match = css.match(/^calc\(([\d.]+)rem \+ ([\d.]+)vw\)$/)
    if (!match) throw new Error(`Unexpected output: ${css}`)
    return Number(match[1]) * rootPx + (Number(match[2]) * viewport) / 100
  }

  for (const device of ['mobile', 'desktop'] as const) {
    const fn = functions[`${device}-text`]
    const frame = screens[device].width

    it(`${device}: equals the design size at the frame width with a 16px root`, () => {
      for (const px of [10, 14, 48, 120]) {
        expect(resolve(fn(String(px)), 16, frame)).toBeCloseTo(px, 6)
      }
    })

    it(`${device}: grows when the root font size grows, unlike ${device}-vw()`, () => {
      expect(resolve(fn('20'), 32, frame)).toBeGreaterThan(20)
    })

    it(`${device}: rejects non-numeric input`, () => {
      expect(() => fn('abc')).toThrow()
    })
  }
})

describe('mobile-vh()', () => {
  it('emits a plain dvh value, never a vh/svh/dvh clamp', () => {
    const result = functions['mobile-vh']('75')

    expect(result).toMatch(/^-?[\d.]+dvh$/)
    expect(result).not.toContain('clamp')
    expect(result).not.toContain('svh')
  })
})
