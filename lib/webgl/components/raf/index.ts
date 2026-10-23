import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useTempus } from 'tempus/react'

import { isAwake, noteSleep, wake } from '@/webgl/utils/awake'

/**
 * RAF (Request Animation Frame) component for controlling WebGL rendering.
 *
 * Uses tempus for frame timing and manually advances the R3F frame loop.
 * The Canvas uses `frameloop="never"` so this component controls rendering.
 *
 * @param render - `true` draws only while something keeps the canvas awake
 *   (see `@/webgl/utils/awake`), `'always'` draws every frame, `false` never
 *   draws.
 */
export function RAF({ render = true }: { render?: boolean | 'always' }) {
  const advance = useThree((state) => state.advance)
  const drawingRef = useRef(false)

  // The first frame has to draw before anything else wakes the canvas.
  useEffect(() => {
    wake()
  }, [])

  // A hidden tab gets no animation frames, so it sleeps even under a hold.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden || !drawingRef.current) return
      drawingRef.current = false
      noteSleep()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useTempus(
    ({ time }) => {
      if (render === 'always' || (render && isAwake(performance.now()))) {
        drawingRef.current = true
        advance(time / 1000)
      } else if (drawingRef.current) {
        drawingRef.current = false
        noteSleep()
      }
    },
    {
      // After Lenis (-1) so the canvas draws this frame's scroll, not the
      // last one's. Order table: components/layout/lenis/index.tsx.
      order: 1,
    }
  )

  return null
}
