import cn from 'clsx'
import { useRef } from 'react'
import { useIntersection } from 'react-use'
import s from './marquee.module.scss'

const Marquee = ({
  children,
  repeat = 2,
  duration = 5,
  offset = 0,
  inverted = false,
  className,
  animationStart = true,
  ...props
}) => {
  const ref = useRef()

  const intersection = useIntersection(ref, { threshold: 0 })

  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        className,
        s.marquee,
        inverted && s.inverted,
        intersection?.isIntersecting && 'running'
      )}
      style={{
        '--duration': duration + 's',
        '--offset': (offset % 100) + '%',
        '--animation-status':
          intersection?.isIntersecting && animationStart ? 'running' : 'paused',
      }}
    >
      {new Array(repeat).fill(children).map((_, i) => (
        <div key={i} className={s.inner}>
          {children}
        </div>
      ))}
    </div>
  )
}

export { Marquee }
