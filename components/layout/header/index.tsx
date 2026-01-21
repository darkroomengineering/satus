'use client'

import cn from 'clsx'
import { usePathname } from 'next/navigation'
import { Link } from '@/components/ui/link'

// Navigation links - customize for your project
const LINKS = [
  { href: '/', label: 'home' },
  { href: '/#features', label: 'features' },
  { href: 'https://github.com/darkroomengineering/satus', label: 'github' },
]

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
      {/* Root level: Logo */}
      <h1 className="dt:text-[13px] text-[12px]">Satūs</h1>

      {/* Level 1: Main navigation */}
      <ul className="mt-1 flex flex-col pl-4">
        {LINKS.map((link) => (
          <li key={link.href} className="flex">
            <span className="-ml-3 w-3 opacity-50">
              {pathname === link.href ? '›' : ''}
            </span>
            <Link href={link.href} className="link">
              {link.label}
            </Link>
          </li>
        ))}
        <li className="flex">
          <span className="-ml-3 w-3 opacity-50">
            {isExamplePage ? '›' : ''}
          </span>
          <span>examples</span>
        </li>

        {/* Level 2: Examples sub-navigation */}
        {EXAMPLES.map((link) => (
          <li key={link.href} className="flex pl-4">
            <span className="-ml-3 w-3 opacity-50">
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
    </nav>
  )
}
