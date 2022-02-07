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
  const setScroll = useStore((state) => state.setScroll)
  const setLocomotive = useStore((state) => state.setLocomotive)

  const el = useRef()
  const [ref, { height }] = useMeasure()

  const scroll = useRef()

  const isTouchDevice = useIsTouchDevice()

  useFrame(() => {
    scroll.current?.raf()
  }, 0)

  useLayoutEffect(() => {
    if (isTouchDevice === undefined) return

    setLocomotive(undefined)

    scroll.current = new LocomotiveScroll({
      el: el.current,
      scrollFromAnywhere: true,
      smooth: !isTouchDevice && smooth,
      tablet: {
        smooth: !isTouchDevice && smooth,
      },
      smartphone: {
        smooth: !isTouchDevice && smooth,
      },
      autoRaf: false,
    })

    setLocomotive(scroll.current)

    return () => {
      scroll.current?.destroy()
    }
  }, [isTouchDevice, smooth])

  useDebounce(
    () => {
      scroll.current?.update()
    },
    debounce,
    [height, debounce]
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
