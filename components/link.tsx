import type { ComponentProps, MouseEvent } from 'react'
import { Link as RRLink, useLocation } from 'react-router'

type RRLinkProps = ComponentProps<typeof RRLink>

interface CustomLinkProps extends Omit<RRLinkProps, 'to'> {
  href?: string
  onClick?: (e: MouseEvent<HTMLElement>) => void
  scroll?: boolean
}

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function Link({
  href,
  children,
  onClick,
  scroll = false,
  className,
  ...props
}: CustomLinkProps) {
  const location = useLocation()
  const isActive = href ? location.pathname === href : false

  // No href + onClick → button
  if (!href && onClick) {
    return (
      <button onClick={onClick} type="button" className={className}>
        {children}
      </button>
    )
  }

  // No href, no onClick → div
  if (!href) {
    return <div className={className}>{children}</div>
  }

  // External link
  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-external
        onClick={onClick}
        className={className}
        {...props}
      >
        {children}
      </a>
    )
  }

  // Internal link
  return (
    <RRLink
      to={href}
      preventScrollReset={!scroll}
      data-active={isActive || undefined}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </RRLink>
  )
}
