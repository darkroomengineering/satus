import { raf } from 'lib/raf'
import { useEffect } from 'react'

export function useFrame(callback, priority = 0) {
  useEffect(() => {
    if (callback) {
      const id = raf.add(callback, priority)

      return () => {
        raf.remove(id)
      }
    }
  }, [callback, priority])
}

export default useFrame
