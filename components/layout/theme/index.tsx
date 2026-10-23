'use client'

import { usePathname } from 'next/navigation'
import { createContext, use, useEffect, useState } from 'react'

import type { Themes } from '@/styles/colors'
import { type ThemeName, themes } from '@/styles/config'

export interface ThemeState {
  name: ThemeName
  theme: Themes[ThemeName]
}

export interface ThemeActions {
  setTheme: (theme: ThemeName) => void
}

export type ThemeContextStandard = {
  state: ThemeState
  actions: ThemeActions
}

const ThemeContextInternal = createContext<ThemeContextStandard | null>(null)

/** Access the theme context: `{ state, actions }`. */
export function useTheme(): ThemeContextStandard {
  const context = use(ThemeContextInternal)
  if (!context) {
    throw new Error('useTheme must be used within a Theme provider')
  }
  return context
}

export function Theme({
  children,
  theme,
  global,
}: {
  children: React.ReactNode
  theme: ThemeName
  global?: boolean
}) {
  const pathname = usePathname()

  // `currentTheme` follows the route's `theme` prop but `setTheme` can override
  // it. On a prop change (navigation) it re-syncs during render, not in an
  // effect, which skips an extra render.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [currentTheme, setCurrentTheme] = useState(theme)
  const [prevTheme, setPrevTheme] = useState(theme)
  if (theme !== prevTheme) {
    setPrevTheme(theme)
    setCurrentTheme(theme)
  }

  useEffect(() => {
    if (global) {
      document.documentElement.setAttribute('data-theme', currentTheme)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', themes[currentTheme].primary)
    }
  }, [pathname, currentTheme, global])

  const contextValue: ThemeContextStandard = {
    state: {
      name: currentTheme,
      theme: themes[currentTheme],
    },
    actions: {
      setTheme: setCurrentTheme,
    },
  }

  // No inline <script> here: scripts in client components never execute on
  // client navigation and trigger React's "Encountered a script tag while
  // rendering" error. The root layout's server-rendered default covers the
  // first paint.
  return (
    <ThemeContextInternal.Provider value={contextValue}>
      {children}
    </ThemeContextInternal.Provider>
  )
}
