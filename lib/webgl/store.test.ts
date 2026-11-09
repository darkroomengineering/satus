import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'

import {
  announcePrimaryClaim,
  claimPrimary,
  getPrimaryClaimId,
  isRootCanvasRegistered,
  registerRootCanvasMount,
  releasePrimary,
  subscribePrimaryClaim,
} from '@/webgl/store'

// Each call stands for the point in `<Canvas root>`'s lifecycle that makes it:
// `claimPrimary` is a render, `announcePrimaryClaim` the layout effect of a
// commit, `registerRootCanvasMount` the mounting effect, and its cleanup plus
// `releasePrimary` the unmount.
describe('primary canvas claim', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    const id = getPrimaryClaimId()
    if (id !== undefined) releasePrimary(id)
    jest.useRealTimers()
  })

  test('a render that never commits does not hold the slot forever', () => {
    expect(claimPrimary('discarded')).toBe(true)
    expect(claimPrimary('real')).toBe(false)
    expect(isRootCanvasRegistered()).toBe(true)

    const listener = jest.fn()
    const unsubscribe = subscribePrimaryClaim(listener)
    jest.advanceTimersByTime(5000)
    unsubscribe()

    expect(getPrimaryClaimId()).toBeUndefined()
    expect(isRootCanvasRegistered()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(claimPrimary('real')).toBe(true)
  })

  test('a mounted canvas takes over from a render that never committed', () => {
    expect(claimPrimary('discarded')).toBe(true)
    expect(claimPrimary('real')).toBe(false)
    const unregister = registerRootCanvasMount('real')

    jest.advanceTimersByTime(5000)
    expect(getPrimaryClaimId()).toBe('real')

    // The promoted canvas is mounted, so its claim is not a lease.
    jest.advanceTimersByTime(60_000)
    expect(getPrimaryClaimId()).toBe('real')

    unregister()
  })

  test('a committed claim survives the lease and frees on release', () => {
    expect(claimPrimary('primary')).toBe(true)
    announcePrimaryClaim('primary')
    jest.advanceTimersByTime(60_000)

    expect(getPrimaryClaimId()).toBe('primary')
    expect(claimPrimary('other')).toBe(false)

    releasePrimary('primary')
    expect(getPrimaryClaimId()).toBeUndefined()
  })

  test('a commit slower than the lease still ends up primary', () => {
    expect(claimPrimary('slow')).toBe(true)
    jest.advanceTimersByTime(5000)
    expect(getPrimaryClaimId()).toBeUndefined()

    announcePrimaryClaim('slow')

    expect(getPrimaryClaimId()).toBe('slow')
    expect(claimPrimary('other')).toBe(false)
    jest.advanceTimersByTime(60_000)
    expect(getPrimaryClaimId()).toBe('slow')
  })

  test('a slow commit does not take the slot from the canvas that claimed it meanwhile', () => {
    expect(claimPrimary('slow')).toBe(true)
    jest.advanceTimersByTime(5000)
    expect(claimPrimary('other')).toBe(true)
    announcePrimaryClaim('other')

    announcePrimaryClaim('slow')

    expect(getPrimaryClaimId()).toBe('other')
    expect(claimPrimary('slow')).toBe(false)
  })

  test("Strict Mode's effect replay leaves the claim confirmed", () => {
    expect(claimPrimary('strict')).toBe(true)
    expect(claimPrimary('strict')).toBe(true)
    announcePrimaryClaim('strict')
    registerRootCanvasMount('strict')()
    releasePrimary('strict')
    announcePrimaryClaim('strict')
    const unregister = registerRootCanvasMount('strict')
    expect(claimPrimary('strict')).toBe(true)

    const listener = jest.fn()
    const unsubscribe = subscribePrimaryClaim(listener)
    jest.advanceTimersByTime(60_000)
    unsubscribe()

    expect(getPrimaryClaimId()).toBe('strict')
    expect(listener).not.toHaveBeenCalled()

    unregister()
  })

  test('only the first of two canvases rendered together is primary', () => {
    expect(claimPrimary('a')).toBe(true)
    expect(claimPrimary('a')).toBe(true)
    expect(claimPrimary('b')).toBe(false)
  })
})
