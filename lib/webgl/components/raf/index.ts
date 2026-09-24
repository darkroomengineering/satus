import { useThree } from '@react-three/fiber'
import { useTempus } from 'tempus/react'

/**
 * RAF (Request Animation Frame) component for controlling WebGL rendering.
 *
 * Uses tempus for frame timing and manually advances the R3F frame loop.
 * The Canvas uses `frameloop="never"` so this component controls rendering.
 *
 * @param render - Whether to render frames. Set to false to pause rendering.
 */
export function RAF({ render = true }) {
  const advance = useThree((state) => state.advance)

  useTempus(
    ({ time }) => {
      if (render) {
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
