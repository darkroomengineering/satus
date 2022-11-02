import { useLayoutEffect } from '@studio-freight/hamo'
import { gsap } from 'gsap'
import { useRef } from 'react'
import { useWindowSize } from 'react-use'

export function Parallax({
  className,
  children,
  speed = 1,
  id = 'parallax',
  position,
}) {
  const trigger = useRef()
  const target = useRef()

  const { width: windowWidth } = useWindowSize()

  useLayoutEffect(() => {
    const y = windowWidth * speed * 0.1
    const mm = gsap.matchMedia()

    const timeline = gsap
      .timeline({
        scrollTrigger: {
          id: id,
          trigger: position === 'top' ? document.body : trigger.current,
          scrub: true,
          start: position === 'top' ? 'top top' : 'top bottom',
          end: position === 'top' ? '+=100%' : 'bottom top',
        },
      })
      .fromTo(
        target.current,
        { y: position === 'top' ? 0 : -y },
        { y: y, ease: 'none' }
      )

    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { reduceMotion } = context.conditions

        if (reduceMotion) {
          timeline.kill()
        }
      }
    )

    return () => {
      timeline.kill()
    }
  }, [id, speed, position, windowWidth])

  return (
    <div ref={trigger}>
      <div ref={target} className={className}>
        {children}
      </div>
    </div>
  )
}
