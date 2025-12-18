'use client'

import cn from 'clsx'
import type { LenisOptions } from 'lenis'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import { Footer } from '~/components/layout/footer'
import { Lenis } from '~/components/layout/lenis'
import { Navigation } from '~/components/layout/navigation'
import { Theme } from '~/components/layout/theme'
import { TransformProvider } from '~/hooks/use-transform'
import type { ThemeName } from '~/styles/config'
import { Canvas } from '~/webgl/components/canvas'

/**
 * Props for the Wrapper component.
 */
interface WrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Theme to apply ('dark' | 'light' | 'red'). Defaults to 'dark'. */
  theme?: ThemeName
  /** Enable smooth scrolling. Can be boolean or Lenis configuration object. Defaults to true. */
  lenis?: boolean | LenisOptions
  /** Enable WebGL canvas. Can be boolean or Canvas component props. */
  webgl?: boolean | Omit<ComponentProps<typeof Canvas>, 'children'>
}

/**
 * Main page wrapper component providing theme, WebGL canvas, and smooth scrolling.
 *
 * This component serves as the root container for pages, automatically handling
 * theme application, WebGL initialization, smooth scrolling, and layout structure.
 * It includes navigation, footer, and optional WebGL canvas.
 *
 * @param props - Component props
 * @param props.theme - Color theme to apply to the page
 * @param props.lenis - Whether to enable smooth scrolling with Lenis
 * @param props.webgl - Whether to initialize WebGL canvas for 3D content
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
 * // With WebGL and custom Lenis options
 * export default function WebGLPage() {
 *   return (
 *     <Wrapper
 *       theme="light"
 *       webgl={{ postprocessing: true }}
 *       lenis={{ duration: 1.2, easing: (t) => t }}
 *     >
 *       <section>3D content here</section>
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
  webgl,
  ...props
}: WrapperProps) {
  const pathname = usePathname()

  const content = (
    <>
      {webgl && (
        <Canvas
          key={webgl ? `canvas-${pathname}` : undefined}
          root
          {...(typeof webgl === 'object' && webgl)}
        />
      )}
      <Navigation />
      <main className={cn('relative flex grow flex-col', className)} {...props}>
        {children}
      </main>
      <Footer />
      {lenis && <Lenis root options={typeof lenis === 'object' ? lenis : {}} />}
    </>
  )

  return (
    <Theme theme={theme} global>
      {webgl ? <TransformProvider>{content}</TransformProvider> : content}
    </Theme>
  )
}
