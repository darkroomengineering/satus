import cn from 'clsx'
import s from './marquee.module.scss'

export function Marquee({
  children,
  repeat = 2,
  duration = 5,
  offset = 0,
  inverted = false,
  className,
  animationStart = true,
}) {
  return (
    <div
      className={cn(className, s.marquee, inverted && s.inverted)}
      style={{
        '--duration': duration + 's',
        '--offset': (offset % 100) + '%',
        '--animation-status': animationStart ? 'running' : 'paused',
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
