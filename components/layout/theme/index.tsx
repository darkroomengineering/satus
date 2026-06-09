'use client'

import { usePathname } from 'next/navigation'
import { createContext, use, useEffect, useState } from 'react'
import type { Themes } from '@/styles/colors'
import { type ThemeName, themes } from '@/styles/config'

// Context state
export interface ThemeState {
  name: ThemeName
  theme: Themes[ThemeName]
}

// Context actions
export interface ThemeActions {
  setTheme: (theme: ThemeName) => void
}

// Context value shape
export type ThemeContextStandard = {
  state: ThemeState
  actions: ThemeActions
}

const ThemeContextInternal = createContext<ThemeContextStandard | null>(null)

/**
 * Hook to access the theme context with standard structure.
 * Returns { state, actions } for new implementations.
 *
 * @example
 * ```tsx
 * const { state, actions } = useTheme()
 * const { name, theme } = state
 * const { setTheme } = actions
 * ```
 */
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

  // `currentTheme` defaults to the route's `theme` prop but can still be
  // overridden at runtime via the `setTheme` action. When the prop changes
  // (navigation), we re-sync *during render* — React's recommended replacement
  // for a setState-in-effect "mirror". This avoids the wasted extra render and
  // breaks the effect chain into the data-theme effect below.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [currentTheme, setCurrentTheme] = useState(theme)
  const [prevTheme, setPrevTheme] = useState(theme)
  if (theme !== prevTheme) {
    setPrevTheme(theme)
    setCurrentTheme(theme)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to trigger on path change
  useEffect(() => {
    if (global) {
      document.documentElement.setAttribute('data-theme', currentTheme)
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

  // NOTE: the global theme is applied to <html> via the effect above (and a
  // server-rendered default in the root layout for no-flash initial paint).
  // We intentionally do NOT render an inline <script> here: scripts inside
  // client components never execute on client navigation and trigger a React
  // "Encountered a script tag while rendering" error.
  return (
    <ThemeContextInternal.Provider value={contextValue}>
      {children}
    </ThemeContextInternal.Provider>
  )
}
