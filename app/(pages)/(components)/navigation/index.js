'use client'

import cn from 'clsx'
import { Link } from 'components/link'
import { usePathname } from 'next/navigation'
import s from './navigation.module.scss'

const LINKS = [
  { href: '/', label: 'home' },
  { href: '/r3f', label: 'r3f' },
  { href: '/storyblok', label: 'storyblok' },
  { href: '/shopify', label: 'shopify' },
  { href: '/hubspot', label: 'hubspot' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className={s.nav}>
      <div className={s.title}>
        <h1>Satūs</h1>
        <span>{pathname}</span>
      </div>

      <ul className={s.list}>
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn('link', s.link, pathname === link.href && s.active)}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
