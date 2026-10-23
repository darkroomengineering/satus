'use client'

import { useWindowSize } from 'hamo'
import { type ReactNode, useEffect } from 'react'

/**
 * Sets `--scrollbar-width` (px), re-measured on resize. Viewport units are
 * native (`dvh`/`svh`); no viewport-unit properties are set. Render once at
 * the app root; usage in `./README.md`.
 */
export function RealViewport({ children }: { children?: ReactNode }) {
  const { width } = useWindowSize()

  useEffect(() => {
    if (width === undefined) return
    const outer = document.createElement('div')
    outer.style.visibility = 'hidden'
    outer.style.overflow = 'scroll'
    document.body.appendChild(outer)
    const inner = document.createElement('div')
    outer.appendChild(inner)
    // oxlint-disable-next-line hamo/no-raw-layout-read -- throwaway probe, read once per resize
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth
    outer.remove()
    document.documentElement.style.setProperty(
      '--scrollbar-width',
      `${scrollbarWidth}px`
    )
  }, [width])

  return children ?? null
}
