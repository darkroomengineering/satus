import s from './marquee.module.scss'
import cn from 'clsx'

const Marquee = ({
  children,
  repeat = 2,
  duration = 5,
  offset = 0,
  inverted = false,
  className,
}) => {
  return (
    <div
      className={cn(className, s.marquee, inverted && s['marquee--inverted'])}
      style={{ '--duration': duration + 's', '--offset': (offset % 100) + '%' }}
    >
      {new Array(repeat).fill(children).map((_, i) => (
        <div key={i} className={s.marquee__inner}>
          {children}
        </div>
      ))}
    </div>
  )
}

export { Marquee }
