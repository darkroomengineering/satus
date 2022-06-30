import { nanoid } from 'nanoid'
import { useEffect } from 'react'

const callbacks = {}

// gsap.ticker.lagSmoothing(0)
// gsap.ticker.remove(gsap.updateRoot)
// callbacks[nanoid()] = {
//   callback: gsap.updateRoot,
//   priority: 0,
// }

if (typeof window !== 'undefined') {
  let time = performance.now()

  const onFrame = (t) => {
    let deltaTime = t - time
    time = t

    Object.entries(callbacks)
      .sort((a, b) => a[1].priority - b[1].priority)
      .forEach(([, { callback }]) => {
        callback(t)
      })
    requestAnimationFrame(onFrame)
  }

  requestAnimationFrame(onFrame)
}

export function useFrame(callback, priority = 0) {
  const id = nanoid()

  useEffect(() => {
    if (callback) {
      callbacks[id] = { callback, priority }

      return () => {
        delete callbacks[id]
      }
    }
  }, [callback, id, priority])
}

export default useFrame
