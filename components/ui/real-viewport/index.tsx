'use client'

import { useWindowSize } from 'hamo'
import { type ReactNode, useEffect } from 'react'

/**
 * Measures the browser's scrollbar width and exposes it as a CSS custom
 * property, re-measuring on resize. Viewport units themselves are handled
 * natively via `dvh`/`svh` — this component does not set any viewport-unit
 * custom properties.
 *
 * Place this component once at the root of your app.
 *
 * CSS variables set:
 * - `--scrollbar-width` — browser scrollbar width in pixels
 *
 * @example
 * ```tsx
 * // app/(site)/layout.tsx
 * import { RealViewport } from '@/components/ui/real-viewport'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <RealViewport>{children}</RealViewport>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
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
