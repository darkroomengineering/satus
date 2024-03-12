import cn from 'clsx'
import { Lenis } from 'components/lenis'
import { Canvas } from 'libs/webgl/components/canvas'
import { Footer } from '../(components)/footer'
import { Navigation } from '../(components)/navigation'
import s from './wrapper.module.scss'

export function Wrapper({
  children,
  theme = 'light',
  lenis = true,
  lenisOptions = {},
  webgl = false,
  className,
}) {
  return (
    <>
      {lenis && <Lenis root options={lenisOptions} />}
      {webgl && <Canvas root />}
      <div className={cn(s.wrapper, `theme-${theme}`, className)}>
        <Navigation />
        <main role="main" className={s.main}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}
