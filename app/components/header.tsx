import { useLocation } from 'react-router'
import { Link } from '@/components/link'

const LINKS = [
  { href: '/', label: 'home' },
  { href: '/components', label: 'components' },
  {
    href: 'https://github.com/darkroomengineering/satus',
    label: 'github',
    external: true,
  },
] as const

export function Header() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-safe left-safe z-2 flex flex-col font-mono dt:text-[11px] text-[10px] uppercase">
      <h1 className="dt:text-[13px] text-[12px]">
        Satus<span className="opacity-50">{pathname}</span>
      </h1>

      <ul className="dr-pl-12 mt-1 flex flex-col gap-px">
        {LINKS.map((link) => {
          const isExternal = 'external' in link && link.external
          return (
            <li key={link.href} className="flex items-center gap-1">
              <span className="w-2 opacity-50">
                {pathname === link.href ? '›' : ''}
              </span>
              <Link
                href={link.href}
                className="link"
                {...(isExternal && {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })}
              >
                {link.label}
                {isExternal && '↗'}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
