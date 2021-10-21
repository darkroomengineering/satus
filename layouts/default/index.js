import { Footer } from 'components/footer'
import { GridDebugger } from 'components/grid-debugger'
import { Scroll } from 'components/scroll'
import s from './layout.module.scss'

export function Layout({ children }) {
  return (
    <>
      <Scroll>
        <main className={s.main} id="main">
          <GridDebugger />
          {children}
        </main>
        <Footer />
      </Scroll>
    </>
  )
}
