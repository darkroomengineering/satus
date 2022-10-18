import { useThree } from '@react-three/fiber'
import { useFrame } from '@studio-freight/hamo'

export function Raf({ render = true }) {
  const { advance } = useThree()

  useFrame((time) => {
    if (render) {
      advance(time / 1000)
    }
  })
}
