import { useIsTouchDevice } from '@studio-freight/hamo'
import cn from 'clsx'
import { Cursor } from 'components/cursor'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import { Scroll } from 'components/scroll'
import s from './layout.module.scss'

export function Layout({ children }) {
  const isTouchDevice = useIsTouchDevice()
  return (
    <div className={cn('theme-store', s.container, 'theme-light')}>
      {isTouchDevice === false && <Cursor />}
      <div className={s['header-wrapper']}>
        <Header className={s.header} />
      </div>
      <Scroll className={s.main} tag="main" debounce={1000}>
        {children}
        <Footer className={s['footer-wrapper']} />
      </Scroll>
    </div>
  )
}
