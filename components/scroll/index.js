import { raf } from '@react-spring/rafz'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
import { useStore } from 'lib/store'
import { createContext, useLayoutEffect, useRef, useState } from 'react'
import { useDebounce, useMeasure } from 'react-use'

export const ScrollContext = createContext(null)

export const Scroll = ({ children, className }) => {
  const setScroll = useStore((state) => state.setScroll)
  const setLocomotive = useStore((state) => state.setLocomotive)

  const el = useRef()
  const [ref, { width, height }] = useMeasure()

  const scroll = useRef()
  const [isReady, setIsReady] = useState(false)

  const isTouchDevice = useIsTouchDevice()

  const [id] = useState(Math.random())

  useLayoutEffect(() => {
    let runFrame = true
    function update() {
      if (!runFrame) return
      scroll.current?.raf()
      return true
    }

    async function initScroll() {
      setIsReady(false)
      setLocomotive(undefined)
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

      setLocomotive(scroll.current)
      setIsReady(true)
    }

    if (isTouchDevice !== undefined) {
      initScroll()
      //https://github.com/pmndrs/react-spring/tree/master/packages/rafz#readme
      raf.onFrame(update)
    }

    return () => {
      runFrame = false
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
      <main
        ref={(node) => {
          el.current = node
          ref(node)
        }}
        className={className}
        data-scroll-container
      >
        {children}
      </main>
    </ScrollContext.Provider>
  )
}
