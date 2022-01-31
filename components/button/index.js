import cn from 'clsx'
import Link from 'next/link'
import s from './button.module.scss'

export const Button = ({ children, href, className, style }) => {
  const isExternal = href && href.startsWith('http')

  return href ? (
    <Link href={href} passHref={isExternal}>
      <a
        {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
        className={cn(s.button, className)}
        style={style}
      >
        {children}
      </a>
    </Link>
  ) : (
    <button className={cn(s.button, className)} style={style}>
      {children}
    </button>
  )
}
