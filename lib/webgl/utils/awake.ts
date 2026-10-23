'use client'

/**
 * @module awake
 *
 * Decides whether the root canvas draws this frame. `RAF` skips the frame
 * while nothing is awake, so an idle page keeps its last picture on screen
 * and spends no GPU time. Two signals keep it awake:
 *
 * - `wake(ms)`, a nudge: one event (a scroll that moved a mesh, a texture
 *   that landed) keeps it drawing for a grace window, long enough for short
 *   eases to finish.
 * - `holdAwake()` / `useHoldAwake(active)`, a lease: for anything that
 *   changes every frame (a spin, a time uniform, a sim still fading), held
 *   until released.
 *
 * Module state, not context: there is one root canvas.
 */

import { useEffect, useState } from 'react'

let awakeUntil = 0
let holds = 0

/** Keeps the canvas drawing for the next `ms` milliseconds. */
export function wake(ms = 2000) {
  awakeUntil = Math.max(awakeUntil, performance.now() + ms)
}

/**
 * Keeps the canvas drawing until the returned release is called. Calling the
 * release more than once has no further effect.
 */
export function holdAwake(): () => void {
  holds++
  let released = false
  return () => {
    if (released) return
    released = true
    holds--
  }
}

/** Holds the canvas awake while `active` is true and the caller is mounted. */
export function useHoldAwake(active: boolean) {
  useEffect(() => {
    if (!active) return
    return holdAwake()
  }, [active])
}

interface Lease {
  readonly held: boolean
  acquire: () => void
  release: () => void
}

function createLease(): Lease {
  let release: (() => void) | null = null
  return {
    get held() {
      return release !== null
    },
    acquire() {
      if (!release) release = holdAwake()
    },
    release() {
      release?.()
      release = null
    },
  }
}

/**
 * A hold the caller acquires and releases imperatively (from a frame loop or
 * a rect callback, where React state would re-render). Released on unmount.
 */
export function useLease(): Lease {
  const [lease] = useState(createLease)
  useEffect(() => lease.release, [lease])
  return lease
}

export function isAwake(now: number) {
  return holds > 0 || now < awakeUntil
}

/**
 * Frames until a trail multiplied by `dissipation` every frame falls below
 * 1% of its strength. A trail that never fades (`dissipation >= 1`) never
 * settles, so the answer is `Infinity`.
 */
export function framesToFade(dissipation: number) {
  if (dissipation <= 0) return 1
  if (dissipation >= 1) return Number.POSITIVE_INFINITY
  return Math.ceil(Math.log(0.01) / Math.log(dissipation))
}
