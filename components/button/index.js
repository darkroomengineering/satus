import cn from 'clsx'
import { Link } from 'components/link'
import s from './button.module.scss'

export function Button({ children, href, className, ...props }) {
  return (
    <Link href={href} className={cn(s.button, className)} {...props}>
      {children}
    </Link>
  )
}
