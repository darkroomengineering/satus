import { useFrame, useIsTouchDevice } from '@studio-freight/hamo'
import LocomotiveScroll from '@studio-freight/locomotive-scroll'
import { debounce as _debounce } from 'debounce'
import { useLayoutEffect } from 'hooks/use-isomorphic-layout-effect'
import { useStore } from 'lib/store'
import { useRouter } from 'next/router'
import { useRef } from 'react'

export const Scroll = ({
  children,
  className,
  id,
  debounce = 1000,
  tag = 'div',
  smooth = true,
}) => {
  const locomotive = useStore((state) => state.locomotive)
  const setLocomotive = useStore((state) => state.setLocomotive)

  const el = useRef()

  const router = useRouter()

  // scroll to hash
  useLayoutEffect(() => {
    if (locomotive?.smooth) {
      const hash = window.location.hash

      if (hash) {
        locomotive?.scrollTo(hash)
      }
    }
  }, [router, locomotive])

  // update locomotive if container height changes
  useLayoutEffect(() => {
    const callback = _debounce(() => {
      locomotive?.update()
    }, debounce)
    const resizeObserver = new ResizeObserver(callback)
    resizeObserver.observe(el.current)

    return () => {
      resizeObserver.disconnect()
      callback.flush()
    }
  }, [debounce, locomotive])

  // smooth scroll is disabled on touch devices
  const isTouchDevice = useIsTouchDevice()

  useFrame(() => {
    locomotive?.raf()
  }, 0)

  useLayoutEffect(() => {
    if (isTouchDevice === undefined) return

    const scroll = new LocomotiveScroll({
      el: el.current,
      scrollFromAnywhere: true,
      smooth:
        !isTouchDevice && smooth && window.location.hash !== '#native-scroll',
      autoRaf: false,
    })
    setLocomotive(scroll)

    return () => {
      setLocomotive(undefined)
      scroll?.destroy()
    }
  }, [isTouchDevice, smooth])

  const Tag = tag

  return (
    <Tag ref={el} className={className} id={id} data-scroll-container>
      {children}
    </Tag>
  )
}
