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
   * Mount the WebGL canvas for this page.
   *
   * This is the per-page alternative to the shared root canvas mounted in the
   * layout (see `lib/features`). Pick ONE strategy: either keep the shared
   * canvas in the layout, or remove it and opt pages in with `webgl`. Enabling
   * both mounts two canvases.
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
 * 3D content is portalled in with `<WebGLTunnel>`. Pass `webgl` to host the
 * canvas here per page instead of using the shared canvas in the layout — pick
 * one of the two strategies, not both.
 *
 * @param props - Component props
 * @param props.theme - Color theme to apply to the page
 * @param props.lenis - Whether to enable smooth scrolling with Lenis
 * @param props.webgl - Whether to mount the WebGL canvas for this page
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
 * // Page-scoped WebGL canvas
 * export default function WebGLPage() {
 *   return (
 *     <Wrapper theme="light" webgl>
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
  webgl = false,
  ...props
}: WrapperProps) {
  return (
    <Theme theme={theme} global>
      {/* Header is rendered here - do NOT add another in layout.tsx */}
      <Header />
      <Canvas root={webgl}>
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
