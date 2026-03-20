import cn from 'clsx'
import { useLocation } from 'react-router'
import { Link } from '@/components/link'

const LINKS = [
  { href: '/', label: 'home' },
  { href: '/#features', label: 'features' },
  {
    href: 'https://github.com/darkroomengineering/satus',
    label: 'github',
    external: true,
  },
] as const

const EXAMPLES = [
  { href: '/components', label: 'components' },
  { href: '/sanity', label: 'sanity' },
]

export function Header() {
  const { pathname } = useLocation()
  const isExamplePage = EXAMPLES.some(
    (ex) => pathname === ex.href || pathname.startsWith(`${ex.href}/`)
  )

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
        <li className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="w-2 opacity-50">{isExamplePage ? '›' : ''}</span>
            <span>examples</span>
          </div>
          <ul className="dr-pl-12 mt-px flex flex-col gap-px">
            {EXAMPLES.map((link) => (
              <li key={link.href} className="flex items-center gap-1">
                <span className="w-2 opacity-50">
                  {pathname === link.href ? '›' : ''}
                </span>
                <Link
                  href={link.href}
                  className={cn(
                    'link transition-opacity hover:opacity-100',
                    pathname === link.href ? 'opacity-100' : 'opacity-40'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  )
}
