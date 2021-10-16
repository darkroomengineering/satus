import { Scroll } from 'components/scroll'
import { Footer } from 'components/footer'
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
