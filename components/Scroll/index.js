import { useRouter } from 'next/dist/client/router'
import dynamic from 'next/dynamic'
import { createContext, useLayoutEffect, useRef } from 'react'

export const ScrollContext = createContext(null)

export const Scroll = ({ children }) => {
  const el = useRef()
  const scroll = useRef()

  const router = useRouter()

  useLayoutEffect(() => {
    const onRouteChangeComplete = (url, { shallow }) => {
      scroll.current.setScroll(0, 0)
      scroll.current.update()
    }

    router.events.on('routeChangeComplete', onRouteChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete)
    }
  }, [])

  useLayoutEffect(() => {
    ;(async () => {
      if (typeof window !== 'undefined') {
        const LocomotiveScroll = (
          await import('@studio-freight/locomotive-scroll')
        ).default
        scroll.current = new LocomotiveScroll({
          el: el.current,
          smooth: true,
          tablet: {
            smooth: true,
          },
          smartphone: {
            smooth: true,
          },
        })
      }
    })()
  }, [])

  return (
    <ScrollContext.Provider value={{ scroll: scroll.current }}>
      <div ref={el} data-scroll-container>
        {children}
      </div>
    </ScrollContext.Provider>
  )
}
