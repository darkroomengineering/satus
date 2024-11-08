import { useFrame } from '@darkroom.engineering/hamo'
import { useRef } from 'react'

export function useFramerate(fps, callback) {
  const timeRef = useRef(0)

  useFrame((time, delaTime) => {
    timeRef.current += delaTime

    if (timeRef.current > 1000 / (typeof fps === 'function' ? fps() : fps)) {
      timeRef.current = 0
      callback?.(time, delaTime)
    }
  })
}
