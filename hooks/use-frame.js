import { raf } from '@react-spring/rafz'
import { useLayoutEffect } from 'react'

// https://github.com/pmndrs/react-spring/tree/master/packages/rafz#readme

const callbacks = {}

raf.onFrame(() => {
  Object.entries(callbacks)
    .sort((a, b) => a[1].priority - b[1].priority)
    .forEach(([_, { callback }]) => {
      callback()
    })
  return true
})

export function useFrame(callback, priority = 0, deps = []) {
  useLayoutEffect(() => {
    if (callback) {
      callbacks[callback] = { callback, priority }

      return () => {
        delete callbacks[callback]
      }
    }
  }, [callback, priority, ...deps])
}
