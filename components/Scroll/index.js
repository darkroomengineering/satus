import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { createContext, useLayoutEffect, useRef } from 'react'
import { raf } from '@react-spring/rafz'
import { useIsTouchDevice } from 'hooks/useIsTouchDevice'

export const ScrollContext = createContext(null)

export const Scroll = ({ children }) => {
  const el = useRef()
  const scroll = useRef()

  const isTouchDevice = useIsTouchDevice()

  const router = useRouter()

  useLayoutEffect(() => {
    const onRouteChangeComplete = () => {
      scroll.current.setScroll(0, 0)
      scroll.current.update()
    }

    router.events.on('routeChangeComplete', onRouteChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete)
    }
  }, [])

  function update() {
    scroll.current?.raf()
    return true
  }

  useLayoutEffect(() => {
    async function initScroll() {
      const LocomotiveScroll = (
        await import('@studio-freight/locomotive-scroll')
      ).default

      scroll.current = new LocomotiveScroll({
        el: el.current,
        smooth: !isTouchDevice,
        tablet: {
          smooth: !isTouchDevice,
        },
        smartphone: {
          smooth: !isTouchDevice,
        },
        autoRaf: false,
      })
    }

    if (isTouchDevice !== undefined) {
      initScroll()
    }

    //https://github.com/pmndrs/react-spring/tree/master/packages/rafz#readme
    raf.onFrame(update)

    return () => {
      raf.cancel(update)
      scroll.current?.destroy()
    }
  }, [isTouchDevice])

  useLayoutEffect(() => {}, [])

  return (
    <ScrollContext.Provider value={{ scroll: scroll.current }}>
      <div ref={el} data-scroll-container>
        {children}
      </div>
    </ScrollContext.Provider>
  )
}
