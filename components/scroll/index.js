import LocomotiveScroll from '@studio-freight/locomotive-scroll'
import { debounce as _debounce } from 'debounce'
import { useFrame } from 'hooks/use-frame'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
import { useStore } from 'lib/store'
import { useLayoutEffect, useRef } from 'react'

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
      smooth: !isTouchDevice && smooth,
      autoRaf: false,
    })
    setLocomotive(scroll)

    return () => {
      setLocomotive(undefined)
      scroll?.destroy()
    }
  }, [isTouchDevice, smooth])

  // useDebounce(
  //   () => {
  //     locomotive?.update()
  //   },
  //   debounce,
  //   [height, debounce, locomotive]
  // )

  const Tag = tag

  return (
    <Tag ref={el} className={className} id={id} data-scroll-container>
      {children}
    </Tag>
  )
}
