import { useScrollbar } from '@14islands/r3f-scroll-rig'
import { useEffect } from 'react'

export function useScroll(callback, deps = []) {
  const { scroll, onScroll } = useScrollbar()

  useEffect(() => {
    if (!scroll) return

    return onScroll(() => {
      callback(scroll)
    })
  }, [scroll, callback, [...deps]])
}
