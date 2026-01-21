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
      <div className="inline-flex gap-1">
        <h1>Satūs</h1>
        <span className="opacity-50">{pathname}</span>
      </div>

      <ul className="mt-2 flex flex-col">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                'link relative pl-4',
                pathname === link.href &&
                  "before:absolute before:left-0 before:content-['›']"
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <span
            className={cn(
              'relative pl-4',
              isExamplePage &&
                "before:absolute before:left-0 before:content-['›']"
            )}
          >
            examples
          </span>
          <ul className="flex flex-col pl-4 opacity-60">
            {EXAMPLES.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'link relative pl-4 transition-opacity hover:opacity-100',
                    pathname === link.href
                      ? "opacity-100 before:absolute before:left-0 before:content-['•']"
                      : 'opacity-60'
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
