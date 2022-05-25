import { useRect } from '@studio-freight/hamo'
import { useScroll } from 'hooks/use-scroll'
import { truncate } from 'lib/maths'
import { useRef } from 'react'
import s from './marquee-scroll.module.scss'

export function MarqueeScroll({ children, className, repeat = 2 }) {
  const el = useRef()

  const lastProgress = useRef(0)

  const [ref, compute] = useRect()

  useScroll(({ scroll }) => {
    const scrollY = scroll

    const progress = -truncate((scrollY * 0.1) % 100, 3)

    const { inView } = compute(scrollY)

    if (inView && progress !== lastProgress.current) {
      el.current.style.setProperty('--marquee-progress', progress + '%')
    }
  })

  return (
    <div
      ref={(node) => {
        el.current = node
        ref(node)
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
