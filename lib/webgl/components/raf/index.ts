import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useTempus } from 'tempus/react'

import { isAwake, wake } from '@/webgl/utils/awake'

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

  // The first frame has to draw before anything else wakes the canvas.
  useEffect(() => {
    wake()
  }, [])

  useTempus(
    ({ time }) => {
      if (render === 'always' || (render && isAwake(performance.now()))) {
        advance(time / 1000)
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
