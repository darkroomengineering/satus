import {
  useFrame,
  useIsTouchDevice,
  useLayoutEffect,
} from '@studio-freight/hamo'
import Lenis from '@studio-freight/lenis/src'
import cn from 'clsx'
import { Cursor } from 'components/cursor'
import { CustomHead } from 'components/custom-head'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import { useStore } from 'lib/store'
import s from './layout.module.scss'

export function Layout({
  seo = { title: '', description: '', image: '', keywords: '' },
  children,
  theme = 'light',
}) {
  const isTouchDevice = useIsTouchDevice()

  const setLenis = useStore(({ setLenis }) => setLenis)
  const lenis = useStore(({ lenis }) => lenis)

  useLayoutEffect(() => {
    if (isTouchDevice === undefined) return
    const lenis = new Lenis({ lerp: 0.1, smooth: !isTouchDevice })
    setLenis(lenis)

    return () => {
      lenis.destroy()
      setLenis(null)
    }
  }, [isTouchDevice])

  useFrame(() => {
    lenis?.raf()
  }, [])

  return (
    <>
      <CustomHead {...seo} />
      <div className={cn(`theme-${theme}`, s.layout)}>
        {isTouchDevice === false && <Cursor />}
        <Header />
        <main className={s.main}>{children}</main>
        <Footer />
      </div>
    </>
  )
}
