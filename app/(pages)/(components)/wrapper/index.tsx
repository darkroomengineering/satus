'use client'

import cn from 'clsx'
import type { LenisOptions } from 'lenis'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import { TransformProvider } from '~/hooks/use-transform'
import type { ThemeName } from '~/styles/config'
import { Canvas } from '~/webgl/components/canvas'
import { Footer } from '../footer'
import { Lenis } from '../lenis'
import { Navigation } from '../navigation'
import { Theme } from '../theme'

interface WrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: ThemeName
  lenis?: boolean | LenisOptions
  webgl?: boolean | Omit<ComponentProps<typeof Canvas>, 'children'>
}

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
      <main className={cn('relative flex flex-col grow', className)} {...props}>
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
