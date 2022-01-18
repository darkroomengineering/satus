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
      {typeof window !== undefined ? (
        <Scroll className={s.main} tag="main" debounce={1000}>
          {children}
          <Footer />
        </Scroll>
      ) : (
        <>
          <main>{children}</main>
          <Footer />
        </>
      )}
    </>
  )
}
