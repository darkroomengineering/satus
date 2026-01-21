'use client'

import cn from 'clsx'
import { usePathname } from 'next/navigation'
import { Link } from '@/components/ui/link'

// Navigation links - customize for your project
const LINKS = [
  { href: '/', label: 'home' },
  { href: '/#features', label: 'features' },
  {
    href: 'https://github.com/darkroomengineering/satus',
    label: 'github',
    external: true,
  },
] as const

// Example pages demonstrating integrations
const EXAMPLES = [
  { href: '/components', label: 'components' },
  { href: '/r3f', label: 'r3f' },
  { href: '/sanity', label: 'sanity' },
  { href: '/shopify', label: 'shopify' },
  { href: '/hubspot', label: 'hubspot' },
]

export function Header() {
  const pathname = usePathname()
  const isExamplePage = EXAMPLES.some(
    (ex) => pathname === ex.href || pathname.startsWith(`${ex.href}/`)
  )

  return (
    <nav className="fixed top-safe left-safe z-2 flex flex-col font-mono dt:text-[11px] text-[10px] uppercase">
      {/* Root level: Logo + current path */}
      <h1 className="dt:text-[13px] text-[12px]">
        Satūs<span className="opacity-50">{pathname}</span>
      </h1>

      {/* Level 1: Main navigation */}
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
        {/* Examples with nested level 2 */}
        <li className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="w-2 opacity-50">{isExamplePage ? '›' : ''}</span>
            <span>examples</span>
          </div>
          {/* Level 2: Examples sub-navigation */}
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
