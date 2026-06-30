'use client'

import { useEffect, useRef } from 'react'

/**
 * Attaches window mouse/touch listeners and calls `onMove` with raw client
 * coordinates and pixel deltas on each move event. Seeds on first input —
 * `onMove` is NOT called for the very first pointer event (no delta to compute).
 *
 * Uses a stable ref internally so consumers can safely close over reactive
 * values (e.g. Three.js size, sim instances) without re-subscribing the
 * window listeners on every render.
 */
export function usePointerInput(
  onMove: (x: number, y: number, dx: number, dy: number) => void
): void {
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

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

      onMoveRef.current(clientX, clientY, dx, dy)
    }

    const handleMouseMove = (event: MouseEvent) => handlePointer(event)
    const handleTouchMove = (event: TouchEvent) => handlePointer(event)

    window.addEventListener('mousemove', handleMouseMove, false)
    window.addEventListener('touchmove', handleTouchMove, false)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, false)
      window.removeEventListener('touchmove', handleTouchMove, false)
    }
  }, [])
}
