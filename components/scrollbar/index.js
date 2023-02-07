import { useRect } from '@studio-freight/hamo'
import { useLenis } from '@studio-freight/react-lenis'
import { clamp } from 'lib/maths'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWindowSize } from 'react-use'
import s from './scrollbar.module.scss'

export function Scrollbar({}) {
  const thumb = useRef()
  const { height: windowHeight } = useWindowSize()
  const [innerRectRef, { height: innerHeight }] = useRect()
  const [thumbRectRef, { height: thumbHeight }] = useRect()

  const lenis = useLenis(({ scroll, limit }) => {
    const progress = scroll / limit

    thumb.current.style.transform = `translate3d(0,${
      progress * (innerHeight - thumbHeight)
    }px,0)`
  })

  const [clicked, setClicked] = useState(false)
  const [startPoint, setStartPoint] = useState({
    progress: 0,
    y: 0,
  })

  const onPointerMove = useCallback(
    (e) => {
      if (!clicked) return

      e.preventDefault()

      const startProgress = startPoint.progress
      const startY = startPoint.y
      const deltaY = e.clientY - startY

      const progress = clamp(0, startProgress + deltaY / innerHeight, 1)
      lenis.scrollTo(progress * lenis.limit, { immediate: true })
      lenis.isScrolling = false
      console.log(lenis.targetScroll)
    },
    [lenis, clicked, windowHeight, innerHeight, startPoint]
  )

  const onPointerUp = useCallback(() => {
    setClicked(false)
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove, false)
    window.addEventListener('pointerup', onPointerUp, false)

    return () => {
      window.removeEventListener('pointermove', onPointerMove, false)
      window.removeEventListener('pointerup', onPointerUp, false)
    }
  }, [onPointerMove, onPointerUp])

  return (
    <div className={s.scrollbar}>
      <div ref={innerRectRef} className={s.inner}>
        <div
          className={s.thumb}
          ref={(node) => {
            thumb.current = node
            thumbRectRef(node)
          }}
          onPointerDown={(e) => {
            setClicked(true)
            setStartPoint({ progress: lenis.progress, y: e.clientY })
          }}
        />
      </div>
    </div>
  )
}
