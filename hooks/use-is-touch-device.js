import { useLayoutEffect, useState } from 'react'
import { useWindowSize } from 'react-use'

export const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(undefined)
  const { width, height } = useWindowSize()

  useLayoutEffect(() => {
    setIsTouchDevice(
      'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    )
  }, [width, height])

  return isTouchDevice
}
