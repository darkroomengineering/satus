'use client'

import cn from 'clsx'
import type { LenisOptions } from 'lenis'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Canvas } from '~/libs/webgl/components/canvas'
import type { themeNames } from '~/styles/config.mjs'
import { Footer } from '../footer'
import { Lenis } from '../lenis'
import { Navigation } from '../navigation'
import s from './wrapper.module.css'

interface WrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: (typeof themeNames)[number]
  lenis?: boolean | LenisOptions
  webgl?: boolean | object
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to trigger on path change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [pathname, theme])

  return (
    <>
      {webgl && <Canvas root {...(typeof webgl === 'object' && webgl)} />}
      <Navigation />
      <main className={cn(s.main, className)} {...props}>
        {children}
        <script>
          {`document.documentElement.setAttribute('data-theme', '${theme}');`}
        </script>
      </main>
      <Footer />
      {lenis && <Lenis root options={typeof lenis === 'object' ? lenis : {}} />}
    </>
  )
}
