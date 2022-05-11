import { useLayoutEffect } from '@studio-freight/hamo'
import { gsap } from 'gsap'
import { useRef } from 'react'

export function Sticky({
  children,
  className,
  start = 'top top',
  end = '+=100%',
  id = 'sticky',
}) {
  const pinSpacer = useRef()
  const trigger = useRef()

  useLayoutEffect(() => {
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: id,
        pinSpacer: pinSpacer.current, // specify pinSpacer to not change the html
        trigger: trigger.current,
        scrub: true,
        pin: true,
        start: start,
        end: end,
      },
    })

    return () => {
      timeline.kill()
    }
  }, [id, start, end])

  return (
    <div ref={pinSpacer}>
      <div className={className} ref={trigger}>
        {children}
      </div>
    </div>
  )
}
