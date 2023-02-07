import { Lenis, useLenis } from '@studio-freight/react-lenis'
import cn from 'clsx'
import { Cursor } from 'components/cursor'
import { CustomHead } from 'components/custom-head'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import { Scrollbar } from 'components/scrollbar'
import Router from 'next/router'
import { useEffect } from 'react'
import s from './layout.module.scss'

export function Layout({
  seo = { title: '', description: '', image: '', keywords: '' },
  children,
  theme = 'light',
  className,
}) {
  const lenis = useLenis()

  useEffect(() => {
    window.lenis = lenis
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
    </>
  )
}
