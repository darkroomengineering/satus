import { useLayoutEffect } from '@studio-freight/hamo'
import { gsap } from 'gsap'
import { mapRange } from 'lib/maths'
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

    const timeline = gsap.timeline({
      scrollTrigger: {
        id: id,
        trigger: trigger.current,
        scrub: true,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (e) => {
          if (position === 'top') {
            gsap.set(target.current, {
              y: -e.progress * y,
            })
          } else {
            gsap.set(target.current, {
              y: -mapRange(0, 1, e.progress, -y, y),
            })
          }
        },
      },
    })

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
