import { useLayoutEffect, useState } from 'react'

export const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(undefined)

  useLayoutEffect(() => {
    const onResize = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0
      )
    }

    onResize()
    window.addEventListener('resize', onResize, false)

    return () => {
      window.removeEventListener('resize', onResize, false)
    }
  }, [])

  return isTouchDevice
}
