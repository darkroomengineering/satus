'use client'

import { useCallback, useLayoutEffect } from 'react'

//https://css-tricks.com/the-trick-to-viewport-units-on-mobile/

export function RealViewport() {
  const onWindowResize = useCallback(() => {
    document.documentElement.style.setProperty(
      '--dvh',
      window.innerHeight * 0.01 + 'px',
    )

    document.documentElement.style.setProperty(
      '--svh',
      document.documentElement.clientHeight * 0.01 + 'px',
    )

    document.documentElement.style.setProperty('--lvh', '1vh')
  }, [])

  useLayoutEffect(() => {
    window.addEventListener('resize', onWindowResize, false)
    onWindowResize()

    return () => {
      window.removeEventListener('resize', onWindowResize, false)
    }
  }, [onWindowResize])
}