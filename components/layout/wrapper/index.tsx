/** Renders <Header> and <Footer> itself: do not add them to layout.tsx or pages. */
'use client'

import cn from 'clsx'
import type { LenisOptions } from 'lenis'
import { ViewTransition } from 'react'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { Lenis } from '@/components/layout/lenis'
import { SafariEdges } from '@/components/layout/safari-edges'
import { Theme } from '@/components/layout/theme'
import type { ThemeName } from '@/styles/config'
import { Canvas } from '@/webgl/components/canvas'

import s from './wrapper.module.css'

function isLenisOptions(value: boolean | LenisOptions): value is LenisOptions {
  return typeof value === 'object'
}

interface WrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: ThemeName
  /** Smooth scrolling: boolean or a Lenis configuration object. Defaults to true. */
  lenis?: boolean | LenisOptions
  /**
   * Mount the WebGL canvas for this page: the per-page alternative to the
   * shared root canvas in the layout (see `lib/features`). Pick one strategy;
   * enabling both mounts two canvases.
   */
  webgl?: boolean
  /** Crossfade this page's main content during navigation. Defaults to true. */
  viewTransition?: boolean
  /**
   * Run the theme's primary color behind mobile Safari's status bar and
   * bottom toolbar (see `components/layout/safari-edges`). Defaults to false:
   * only pages whose top and bottom edges are one solid color benefit.
   */
  safariEdges?: boolean
}

/**
 * Page root: theme, Lenis smooth scroll, header and footer.
 *
 * 3D content is portalled in with `<WebGLTunnel>`. Pass `webgl` to host the
 * canvas here per page instead of the shared canvas in the layout; pick one
 * strategy, not both.
 *
 * `className` overrides the base layout (see wrapper.module.css).
 */
export function Wrapper({
  children,
  theme = 'dark',
  className,
  lenis = true,
  webgl = false,
  viewTransition = true,
  safariEdges = false,
  ...props
}: WrapperProps) {
  return (
    <Theme theme={theme} global>
      <Header />
      <Canvas root={webgl}>
        <ViewTransition
          name={viewTransition ? 'page-content' : undefined}
          default="none"
          share={viewTransition ? 'page-transition' : 'none'}
        >
          <main id="main-content" className={cn(s.main, className)} {...props}>
            {children}
          </main>
        </ViewTransition>
      </Canvas>
      <Footer />
      {safariEdges && <SafariEdges />}
      {lenis && (
        <Lenis root options={isLenisOptions(lenis) ? lenis : {}} syncAnime />
      )}
    </Theme>
  )
}
