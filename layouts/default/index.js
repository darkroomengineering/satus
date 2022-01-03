import { Cursor } from 'components/cursor'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import { Scroll } from 'components/scroll'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
import s from './layout.module.scss'

export function Layout({ children }) {
  const isTouchDevice = useIsTouchDevice()
  return (
    <>
      {isTouchDevice === false && <Cursor />}
      <Header />
      <Scroll className={s.main}>
        {children}
        <Footer />
      </Scroll>
    </>
  )
}
