import { useIsTouchDevice } from '@studio-freight/hamo'
import { Cursor } from 'components/cursor'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import { Scroll } from 'components/scroll'
import s from './layout.module.scss'

export function Layout({ children }) {
  const isTouchDevice = useIsTouchDevice()
  return (
    <div>
      {isTouchDevice === false && <Cursor />}
      <Header />
      <Scroll className={s.main} tag="main" debounce={1000}>
        {children}
        <section data-scroll-section>
          <Footer />
        </section>
      </Scroll>
    </div>
  )
}
