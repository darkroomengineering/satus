import { useThree } from '@react-three/fiber'
import { useTempus } from 'tempus/react'

export function RAF({ render = true }) {
  const advance = useThree((state) => state.advance)

  useTempus(
    (time: number) => {
      if (render) {
        advance(time / 1000)
      }
    },
    {
      priority: 1,
    }
  )

  return null
}
