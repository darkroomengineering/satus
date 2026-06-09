'use client'

import cn from 'clsx'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Link } from '@/components/ui/link'
import s from './header.module.css'

// Navigation links - customize for your project
const LINKS = [
  { href: '/', label: 'home' },
  { href: 'http://localhost:6006', label: 'storybook', external: true },
  {
    href: 'https://github.com/darkroomengineering/satus',
    label: 'github',
    external: true,
  },
] as const

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
          const isExternal = 'external' in link && link.external
          const isActive = pathname === link.href

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
    </header>
  )
}
