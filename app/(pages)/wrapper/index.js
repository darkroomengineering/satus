import cn from 'clsx'
import { Lenis } from 'components/lenis'
import { Canvas } from 'libs/webgl/components/canvas'
import { Footer } from '../footer'
import s from './wrapper.module.scss'

export function Wrapper({ children, theme = 'light', className }) {
  return (
    <>
      <Lenis root />
      <Canvas root />
      <div className={cn(s.wrapper, `theme-${theme}`, className)}>
        {/* <Header /> */}
        <main role="main" className={s.main}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}
