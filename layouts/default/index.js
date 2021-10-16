import { Scroll } from 'components/scroll_'
import { Footer } from 'components/footer_'
import s from './layout.module.scss'

export function Layout({ children }) {
  return (
    <>
      <Scroll>
        <main className={s.main}>{children}</main>
        <Footer />
      </Scroll>
    </>
  )
}
