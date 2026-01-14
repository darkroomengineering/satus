'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Themes } from '@/styles/colors'
import { type ThemeName, themes } from '@/styles/config'

export const ThemeContext = createContext<{
  name: ThemeName
  theme: Themes[ThemeName]
  setThemeName: (theme: ThemeName) => void
}>({
  name: 'light',
  theme: themes.light,
  setThemeName: () => {
    void 0
  },
})

export function useTheme() {
  return useContext(ThemeContext)
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

  return (
    <>
      {global && (
        <script>
          {`document.documentElement.setAttribute('data-theme', '${currentTheme}');`}
        </script>
      )}
      <ThemeContext.Provider
        value={{
          name: currentTheme,
          theme: themes[currentTheme],
          setThemeName: setCurrentTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    </>
  )
}
