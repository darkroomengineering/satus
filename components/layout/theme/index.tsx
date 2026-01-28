'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Themes } from '@/styles/colors'
import { type ThemeName, themes } from '@/styles/config'
import type { StandardContext } from '@/utils/context'

// Standard context state
export interface ThemeState {
  name: ThemeName
  theme: Themes[ThemeName]
}

// Standard context actions
export interface ThemeActions {
  setTheme: (theme: ThemeName) => void
}

// Standard context type
export type ThemeContextStandard = StandardContext<ThemeState, ThemeActions>

/**
 * @deprecated Use ThemeContextStandard for new implementations.
 * This type is kept for backward compatibility.
 */
export interface ThemeContextLegacyType {
  name: ThemeName
  theme: Themes[ThemeName]
  setThemeName: (theme: ThemeName) => void
}

const ThemeContextInternal = createContext<ThemeContextStandard | null>(null)

/**
 * @deprecated Use useTheme() which returns { state, actions }.
 * Kept as export for backward compatibility.
 */
export const ThemeContext = ThemeContextInternal

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
  const context = useContext(ThemeContextInternal)
  if (!context) {
    throw new Error('useTheme must be used within a Theme provider')
  }
  return context
}

/**
 * @deprecated Use useTheme() which returns { state, actions }.
 * This hook is kept for backward compatibility.
 */
export function useThemeLegacy(): ThemeContextLegacyType {
  const { state, actions } = useTheme()
  return {
    name: state.name,
    theme: state.theme,
    setThemeName: actions.setTheme,
  }
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

  const [currentTheme, setCurrentTheme] = useState(theme)

  useEffect(() => {
    setCurrentTheme(theme)
  }, [theme])

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

  return (
    <>
      {global && (
        <script>
          {`document.documentElement.setAttribute('data-theme', '${currentTheme}');`}
        </script>
      )}
      <ThemeContextInternal.Provider value={contextValue}>
        {children}
      </ThemeContextInternal.Provider>
    </>
  )
}
