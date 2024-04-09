import cn from 'clsx'
import { Lenis } from 'libs/react-lenis'
import { Canvas } from 'libs/webgl/components/canvas'
import { Footer } from '../footer'
import { Navigation } from '../navigation'
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
