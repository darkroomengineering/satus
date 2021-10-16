// import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import {
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { raf } from '@react-spring/rafz'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
import { useDebounce, useMeasure } from 'react-use'
import { useStore } from 'lib/store'

export const ScrollContext = createContext(null)

export const Scroll = ({ children }) => {
  const setScroll = useStore((state) => state.setScroll)

  const el = useRef()
  const [ref, { width, height }] = useMeasure()

  const scroll = useRef()
  const [isReady, setIsReady] = useState(false)

  const isTouchDevice = useIsTouchDevice()

  // const router = useRouter()

  // useEffect(() => {
  //   const onRouteChangeComplete = () => {
  //     scroll.current?.setScroll(0, 0)
  //     scroll.current?.update()
  //   }

  //   router.events.on('routeChangeComplete', onRouteChangeComplete)

  //   return () => {
  //     router.events.off('routeChangeComplete', onRouteChangeComplete)
  //   }
  // }, [])

  function update() {
    scroll.current?.raf()
    return true
  }

  useLayoutEffect(() => {
    setScroll(undefined)
    const onScroll = (e) => {
      setScroll(e)
    }

    async function initScroll() {
      setIsReady(false)
      const LocomotiveScroll = (
        await import('@studio-freight/locomotive-scroll')
      ).default

      scroll.current = new LocomotiveScroll({
        el: el.current,
        scrollFromAnywhere: true,
        smooth: !isTouchDevice,
        tablet: {
          smooth: !isTouchDevice,
        },
        smartphone: {
          smooth: !isTouchDevice,
        },
        autoRaf: false,
      })
      scroll.current.on('scroll', onScroll)
      setIsReady(true)
    }

    if (isTouchDevice !== undefined) {
      initScroll()
      //https://github.com/pmndrs/react-spring/tree/master/packages/rafz#readme
      raf.onFrame(update)
    }

    return () => {
      raf.cancel(update)
      scroll.current?.off('scroll', onScroll)
      scroll.current?.destroy()
    }
  }, [isTouchDevice])

  useDebounce(
    () => {
      scroll.current?.update()
    },
    1000,
    [width, height]
  )

  return (
    <ScrollContext.Provider value={{ scroll: scroll.current, isReady }}>
      <div
        ref={(node) => {
          el.current = node
          ref(node)
        }}
        data-scroll-container
      >
        {children}
      </div>
    </ScrollContext.Provider>
  )
}
