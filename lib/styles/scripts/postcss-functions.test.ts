/**
 * Regression test for issue #395: `mobile-vh()` must emit `dvh` directly, not
 * `clamp(Nvh, Nsvh, Ndvh)`, which resolves to plain `vh` (`vh >= dvh >= svh` on
 * modern mobile) - the address-bar-hidden value `h-dvh` exists to avoid.
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
})
