import { useStore } from 'lib/store'
import { useEffect } from 'react'

export function useScroll(callback) {
  const lenis = useStore(({ lenis }) => lenis)

  useEffect(() => {
    if (!lenis) return
    lenis.on('scroll', callback)
    callback({ scroll: lenis.scroll })

    return () => {
      lenis.off('scroll', callback)
    }
  }, [lenis, callback])
}
