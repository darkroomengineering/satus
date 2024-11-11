import { useFrame } from '@darkroom.engineering/hamo'
import { useThree } from '@react-three/fiber'

export function RAF({ render = true }) {
  const advance = useThree((state) => state.advance)

  useFrame((time: number) => {
    if (render) {
      advance(time / 1000)
    }
  }, 1)

  return null
}
