import { useLayoutEffect } from 'react'
import { useWindowSize } from 'react-use'

export const RealViewport = () => {
  const { height } = useWindowSize()

  useLayoutEffect(() => {
    //https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
    function onWindowResize() {
      document.documentElement.style.setProperty(
        '--vh',
        window.innerHeight * 0.01 + 'px'
      )
    }

    window.addEventListener('resize', onWindowResize, false)
    onWindowResize()

    return () => {
      window.removeEventListener('resize', onWindowResize, false)
    }
  }, [])

  return null
}
