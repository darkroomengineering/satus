import { useFrame } from '@darkroom.engineering/hamo'
import { useRef } from 'react'

type FPSValue = number | (() => number)
type FrameCallback = (time: number, deltaTime: number) => void

export function useFramerate(
  fps: FPSValue,
  callback?: FrameCallback,
  priority = 0
): void {
  const timeRef = useRef(0)

  useFrame((time, deltaTime) => {
    timeRef.current += deltaTime

    const executionTime = 1000 / (typeof fps === 'function' ? fps() : fps)

    if (timeRef.current >= executionTime) {
      timeRef.current = timeRef.current % executionTime
      callback?.(time, deltaTime)
    }
  }, priority)
}
