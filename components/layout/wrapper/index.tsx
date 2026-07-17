/**
 * Main page wrapper providing theme, smooth scrolling, and WebGL context.
 *
 * IMPORTANT: This component ALREADY includes <Header> and <Footer>.
 * Do NOT add Header/Footer to layout.tsx or individual pages - they render here.
 *
 * Customize the Header and Footer components for your project needs.
 */
'use client'

import cn from 'clsx'
import type { LenisOptions } from 'lenis'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { Lenis } from '@/components/layout/lenis'
import { Theme } from '@/components/layout/theme'
import type { ThemeName } from '@/styles/config'
import { Canvas } from '@/webgl/components/canvas'

/**
 * Props for the Wrapper component.
 */
interface WrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Theme to apply ('dark' | 'light' | 'red'). Defaults to 'dark'. */
  theme?: ThemeName
  /** Enable smooth scrolling. Can be boolean or Lenis configuration object. Defaults to true. */
  lenis?: boolean | LenisOptions
  /**
   * @deprecated No-op. The layout (`lib/features`) owns the single root WebGL
   * canvas; the store enforces one root at runtime, so this prop can no
   * longer mount a second one. Content reaches the shared canvas from any
   * page via `<WebGLTunnel>` — no per-page opt-in needed. If a fork genuinely
   * wants a page-scoped canvas instead of the shared one, remove the layout
   * canvas (`lib/features`) and mount `<Canvas root>` directly in that page.
   */
  webgl?: boolean
}

/**
 * Main page wrapper component providing theme, smooth scrolling, and WebGL.
 *
 * This component serves as the root container for pages, automatically handling
 * theme application, smooth scrolling, and layout structure.
 * It includes navigation and footer.
 *
 * 3D content is portalled in with `<WebGLTunnel>` from any page — the shared
 * canvas mounted in the layout (`lib/features`) is the single WebGL root.
 *
 * @param props - Component props
 * @param props.theme - Color theme to apply to the page
 * @param props.lenis - Whether to enable smooth scrolling with Lenis
 * @param props.webgl - Deprecated, no-op. See the `webgl` prop's JSDoc.
 * @param props.children - Page content
 * @param props.className - Additional CSS classes
 *
 * @example
 * ```tsx
 * // Basic usage with theme
 * export default function Page() {
 *   return (
 *     <Wrapper theme="dark">
 *       <section>My page content</section>
 *     </Wrapper>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 3D content, tunneled into the shared layout canvas
 * export default function WebGLPage() {
 *   return (
 *     <Wrapper theme="light">
 *       <WebGLTunnel>
 *         <My3DScene />
 *       </WebGLTunnel>
 *       <section>Content overlaying 3D</section>
 *     </Wrapper>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Disable smooth scrolling
 * export default function StaticPage() {
 *   return (
 *     <Wrapper lenis={false}>
 *       <section>Content without smooth scroll</section>
 *     </Wrapper>
 *   )
 * }
 * ```
 */
export function Wrapper({
  children,
  theme = 'dark',
  className,
  lenis = true,
  webgl: _webgl = false,
  ...props
}: WrapperProps) {
  return (
    <Theme theme={theme} global>
      {/* Header is rendered here - do NOT add another in layout.tsx */}
      <Header />
      <Canvas>
        <main
          id="main-content"
          className={cn('relative flex grow flex-col', className)}
          {...props}
        >
          {children}
        </main>
      </Canvas>
      {/* Footer is rendered here - do NOT add another in layout.tsx */}
      <Footer />
      {lenis && (
        <Lenis
          root
          options={typeof lenis === 'object' ? lenis : {}}
          syncScrollTrigger
        />
      )}
    </Theme>
  )
}
