import { useLayoutEffect } from '@studio-freight/hamo'
import { gsap } from 'gsap'
import { useRef } from 'react'

export function Sticky({
  children,
  wrapperClass,
  className,
  start = 0,
  end = 0,
  // offset = '0 0',
  id = 'sticky',
  enabled = true,
}) {
  const pinSpacer = useRef()
  const trigger = useRef()

  useLayoutEffect(() => {
    if (!enabled) return
    // const offsets = offset.split(' ').map((v) => parseFloat(v))
    // console.log(offsets)
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: id,
        // pinType: 'transform',
        pinSpacing: false,
        pinSpacer: pinSpacer.current, // specify pinSpacer to not change the html
        trigger: trigger.current,
        scrub: true,
        pin: true,
        start: `top top+=${parseFloat(start)}px`,
        end: () => {
          const pinHeight = pinSpacer.current.offsetHeight
          const triggerHeight = trigger.current.offsetHeight

          return `+=${pinHeight - triggerHeight + parseFloat(end)}px`
        },
        invalidateOnRefresh: true,
      },
    })

    return () => {
      timeline.kill()
    }
  }, [id, start, enabled])

  return (
    <div
      ref={(node) => {
        pinSpacer.current = node
      }}
      className={wrapperClass}
    >
      <div
        ref={(node) => {
          trigger.current = node
        }}
        className={className}
      >
        {children}
      </div>
    </div>
  )
}
