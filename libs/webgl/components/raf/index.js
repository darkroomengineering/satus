import { useThree } from '@react-three/fiber'
import { useFrame } from '@studio-freight/hamo'

export function RAF({ render = true }) {
  const { advance } = useThree()

  useFrame((time) => {
    if (render) {
      advance(time / 1000)
    }
  }, 1)
}
