import { useStore } from 'lib/store'
import { useEffect } from 'react'

export function useScroll(callback) {
  const locomotive = useStore((state) => state.locomotive)

  useEffect(() => {
    locomotive?.on('scroll', callback)

    return () => {
      locomotive?.off('scroll', callback)
    }
  }, [locomotive, callback])
}
