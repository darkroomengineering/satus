'use client'

import cn from 'clsx'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { getLinkIntent, Link } from '@/components/ui/link'

import s from './header.module.css'

// `newTab` forces new-tab behavior for a relative href. Absolute http(s)
// hrefs, like the GitHub link, get new-tab and the arrow indicator
// automatically via isExternalHref.
type NavLink = { href: string; label: string; newTab?: boolean }

// Navigation links - customize for your project
const LINKS: NavLink[] = [
  { href: '/', label: 'home' },
  {
    href: 'https://github.com/darkroomengineering/satus',
    label: 'github',
  },
]

export function Header() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={s.header}>
      {/* Brand: logo + live pathname */}
      <div className={s.brand}>
        <span>Satūs</span>
        <span className={s.brandPath}>{pathname}</span>
      </div>

      {/* Mobile menu toggle */}
      <button
        aria-expanded={menuOpen}
        aria-controls="header-nav"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        className={s.menuToggle}
        onClick={() => setMenuOpen((prev) => !prev)}
        type="button"
      >
        {menuOpen ? '✕ close' : '≡ menu'}
      </button>

      {/* Level 1: Main navigation */}
      <ul className={cn(s.navList, menuOpen && s.navListOpen)} id="header-nav">
        {LINKS.map((link) => {
          const { isExternal: opensNewTab, isActive } = getLinkIntent(
            link.href,
            pathname,
            { newTab: link.newTab }
          )

          return (
            <li key={link.href} className={s.navItem}>
              <span className={cn(s.chevron, isActive && s.chevronActive)}>
                ›
              </span>
              <Link
                className={cn(
                  s.navLink,
                  isActive ? s.navLinkActive : s.navLinkDim
                )}
                href={link.href}
                newTab={link.newTab}
              >
                {link.label}
                {opensNewTab && '↗'}
              </Link>
            </li>
          )
        })}
      </ul>
    </header>
  )
}
