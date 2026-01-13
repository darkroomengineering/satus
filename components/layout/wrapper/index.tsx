/**
 * Main page wrapper providing theme, smooth scrolling, and WebGL context.
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
   * Enable WebGL for this page.
   * Activates the GlobalCanvas and provides tunnel context for WebGLTunnel content.
   * The GlobalCanvas must be mounted in your root layout for this to work.
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
 * When `webgl` is true, the GlobalCanvas is activated and WebGLTunnel content
 * is rendered. The GlobalCanvas must be mounted in your root layout.
 *
 * Benefits of GlobalCanvas (vs local canvas):
 * - **No context recreation**: WebGL context persists across route navigation
 * - **Seamless transitions**: No flicker or delay when navigating WebGL routes
 * - **Shared textures**: Preloaded assets stay loaded across routes
 * - **CSS visibility + RAF pausing**: Zero overhead when not visible
 * - **Zero overhead**: Non-WebGL pages don't trigger any WebGL code
 *
 * @param props - Component props
 * @param props.theme - Color theme to apply to the page
 * @param props.lenis - Whether to enable smooth scrolling with Lenis
 * @param props.webgl - Whether to activate WebGL for this page
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
 * // With WebGL content (requires GlobalCanvas in root layout)
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
      <Footer />
      {lenis && <Lenis root options={typeof lenis === 'object' ? lenis : {}} />}
    </Theme>
  )
}
