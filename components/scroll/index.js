import LocomotiveScroll from '@studio-freight/locomotive-scroll'
import { useFrame } from 'hooks/use-frame'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
import { useStore } from 'lib/store'
import { useLayoutEffect, useRef } from 'react'
import { useDebounce, useMeasure } from 'react-use'

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
  const [ref, { height }] = useMeasure()

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

  // update locomotive if container height changes
  useDebounce(
    () => {
      locomotive?.update()
    },
    debounce,
    [height, debounce, locomotive]
  )

  const Tag = tag

  return (
    <Tag
      ref={(node) => {
        el.current = node
        ref(node)
      }}
      className={className}
      id={id}
      data-scroll-container
    >
      {children}
    </Tag>
  )
}
