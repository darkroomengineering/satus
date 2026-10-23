'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

/**
 * Calls `onMove` with raw client coordinates and pixel deltas on each window
 * mouse/touch move. NOT called for the very first pointer event (it only seeds
 * the position; no delta yet). `onMove` goes through `useEffectEvent`, so it
 * can close over reactive values without re-subscribing the listeners.
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
 * Multiplexes one set of window pointer listeners to N subscribers. Mount once
 * (in `FlowmapProvider`) and share the returned `subscribe` via context:
 * separate `usePointerInput` calls per sim would double the move work per
 * event. `subscribe` has a stable identity, so it is safe in effect deps.
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
