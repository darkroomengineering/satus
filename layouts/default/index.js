import { Scroll } from 'components/Scroll'
import { Footer } from 'components/Footer'
import s from './style.module.scss'

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
