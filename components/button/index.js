import cn from 'clsx'
import { Link } from 'components/link'
import s from './button.module.scss'

export const Button = ({ children, href, className, style, onClick }) => {
  return href ? (
    <Link
      href={href}
      className={cn(s.button, className)}
      style={style}
      onClick={onClick}
    >
      {children}
    </Link>
  ) : (
    <button className={cn(s.button, className)} style={style} onClick={onClick}>
      {children}
    </button>
  )
}
