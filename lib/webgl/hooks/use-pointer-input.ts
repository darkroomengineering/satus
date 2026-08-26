'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

/**
 * Attaches window mouse/touch listeners and calls `onMove` with raw client
 * coordinates and pixel deltas on each move event. Seeds on first input —
 * `onMove` is NOT called for the very first pointer event (no delta to compute).
 *
 * `onMove` goes through `useEffectEvent`, so consumers can safely close over
 * reactive values (e.g. Three.js size, sim instances) without re-subscribing
 * the window listeners on every render.
 */
export function usePointerInput(
  onMove: (x: number, y: number, dx: number, dy: number) => void
): void {
  const handleMove = useEffectEvent(onMove)

  useEffect(() => {
    const last = { x: 0, y: 0, isInit: false }

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      let clientX: number
      let clientY: number

      if ('changedTouches' in event && event.changedTouches?.length) {
        clientX = event.changedTouches[0]?.clientX ?? 0
        clientY = event.changedTouches[0]?.clientY ?? 0
      } else if ('clientX' in event) {
        clientX = event.clientX
        clientY = event.clientY
      } else {
        return
      }

      // Seed position on first event; no delta to report yet.
      if (!last.isInit) {
        last.isInit = true
        last.x = clientX
        last.y = clientY
        return
      }

      const dx = clientX - last.x
      const dy = clientY - last.y
      last.x = clientX
      last.y = clientY

      handleMove(clientX, clientY, dx, dy)
    }

    const handleMouseMove = (event: MouseEvent) => handlePointer(event)
    const handleTouchMove = (event: TouchEvent) => handlePointer(event)

    // Passive: `handlePointer` never calls preventDefault, so the browser is
    // free to start scrolling without waiting on this handler.
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])
}

export type PointerMoveHandler = (
  x: number,
  y: number,
  dx: number,
  dy: number
) => void

/**
 * Multiplexes a single set of window pointer listeners to N subscribers.
 * Mount once — e.g. in `FlowmapProvider` — and hand the returned `subscribe`
 * function down through context so `useFluidSim`/`useFlowmapSim` each
 * register their own handler instead of every sim mounting its own
 * `usePointerInput` (which doubles mousemove/touchmove work per event when
 * both sims are active on the same canvas).
 *
 * The returned `subscribe` function has a stable identity for the lifetime
 * of the component, so consumers can safely list it in an effect's deps
 * without resubscribing on every render.
 */
export function usePointerInputSubscribe(): (
  handler: PointerMoveHandler
) => () => void {
  const handlersRef = useRef<Set<PointerMoveHandler>>(new Set())

  usePointerInput((x, y, dx, dy) => {
    for (const handler of handlersRef.current) {
      handler(x, y, dx, dy)
    }
  })

  const subscribeRef = useRef((handler: PointerMoveHandler) => {
    handlersRef.current.add(handler)
    return () => {
      handlersRef.current.delete(handler)
    }
  })

  // react-doctor-disable-next-line react-hooks-js/refs
  return subscribeRef.current // oxlint-disable-line react/refs -- stable-identity subscribe function: initialized once, never reassigned, so this render read can never observe a changing value
}
