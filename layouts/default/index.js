import { Cursor, CustomHead, Scrollbar } from '@studio-freight/compono'
import { useDebug } from '@studio-freight/hamo'
import { Lenis, useLenis } from '@studio-freight/react-lenis'
import cn from 'clsx'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import dynamic from 'next/dynamic'
import Router from 'next/router'
import { useEffect } from 'react'
import s from './layout.module.scss'

const Orchestra = dynamic(
  () => import('lib/orchestra').then(({ Orchestra }) => Orchestra),
  { ssr: false }
)

export function Layout({
  seo = { title: '', description: '', image: '', keywords: '' },
  children,
  theme = 'light',
  className,
}) {
  const debug = useDebug()

  const lenis = useLenis()

  useEffect(() => {
    function onHashChangeStart(url) {
      url = '#' + url.split('#').pop()
      lenis.scrollTo(url)
    }

    Router.events.on('hashChangeStart', onHashChangeStart)

    return () => {
      Router.events.off('hashChangeStart', onHashChangeStart)
    }
  }, [lenis])

  return (
    <>
      <CustomHead {...seo} />
      <Lenis root>
        <div className={cn(`theme-${theme}`, s.layout, className)}>
          <Cursor />
          <Scrollbar />
          <Header />
          <main className={s.main}>{children}</main>
          <Footer />
        </div>
      </Lenis>
      {debug && (
        <>
          <Orchestra />
        </>
      )}
    </>
  )
}
