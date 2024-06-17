import cn from 'clsx'
import { Lenis } from 'libs/lenis'
import { Canvas } from 'libs/webgl/components/canvas'
import { forwardRef } from 'react'
import { Footer } from '../footer'
import { Navigation } from '../navigation'
import s from './wrapper.module.scss'

export const Wrapper = forwardRef(
  (
    {
      children,
      theme = 'light',
      lenis = true,
      lenisOptions = {},
      webgl = false,
      className,
    },
    ref,
  ) => {
    return (
      <>
        {lenis && <Lenis root options={lenisOptions} />}
        <div className={cn(s.wrapper, `theme-${theme}`, className)}>
          <Navigation />
          <main ref={ref} role="main" className={s.main}>
            {webgl && <Canvas root />}
            {children}
          </main>
          <Footer />
        </div>
      </>
    )
  },
)

Wrapper.displayName = 'Wrapper'
