import { useFrame } from '@darkroom.engineering/hamo'
import { useRef } from 'react'

export function useFramerate(fps, callback, priority = 0) {
  const timeRef = useRef(0)

  useFrame((time, delaTime) => {
    timeRef.current += delaTime

    const executionTime = 1000 / (typeof fps === 'function' ? fps() : fps)

    if (timeRef.current >= executionTime) {
      timeRef.current = timeRef.current % executionTime
      callback?.(time, delaTime)
    }
  }, priority)
}
