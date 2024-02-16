import cn from 'clsx'
import { Lenis } from 'components/lenis'
import { Canvas } from 'libs/webgl/components/canvas'
import { Footer } from '../footer'
import { Header } from '../header'
import s from './wrapper.module.scss'

export function Wrapper({ children, theme = 'light' }) {
  return (
    <>
      <Lenis root />
      <Canvas root />
      <div className={cn(s.wrapper, `theme-${theme}`)}>
        <Header />
        <main role="main" className={s.main}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}
