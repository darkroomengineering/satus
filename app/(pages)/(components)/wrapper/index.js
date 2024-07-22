import cn from 'clsx'
import { Canvas } from 'libs/webgl/components/canvas'
import { Footer } from '../footer'
import { Lenis } from '../lenis'
import { Navigation } from '../navigation'
import s from './wrapper.module.scss'

export function Wrapper({
  children,
  theme = 'light',
  lenis = {
    lerp: 0.125,
  },
  webgl = false,
  className,
}) {
  return (
    <>
      {lenis && <Lenis root options={lenis} />}
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
