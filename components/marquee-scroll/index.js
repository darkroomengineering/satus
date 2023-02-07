import { useLenis } from '@studio-freight/react-lenis'
import { useIntersection } from 'hooks/use-intersection'
import { useRef } from 'react'
import s from './marquee-scroll.module.scss'

export function MarqueeScroll({
  children,
  className,
  repeat = 2,
  speed = 0.1,
}) {
  const el = useRef()

  const [isIntersecting, setIntersectionRef] = useIntersection()

  useLenis(
    ({ scroll }) => {
      if (isIntersecting) {
        const progress = -(scroll * speed) % 100
        el.current.style.setProperty('--marquee-progress', progress + '%')
      }
    },
    [isIntersecting]
  )

  return (
    <div
      ref={(node) => {
        el.current = node
        setIntersectionRef(node)
      }}
      className={className}
    >
      <div className={s.marquee}>
        {new Array(repeat).fill(children).map((_, i) => (
          <div key={i} className={s.inner}>
            {children}
          </div>
        ))}
      </div>
    </div>
  )
}
