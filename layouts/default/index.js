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
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { useStore } from 'lib/store'
import s from './layout.module.scss'

export function Layout({
  seo = { title: '', description: '', image: '', keywords: '' },
  children,
  theme = 'light',
  className,
}) {
  const isTouchDevice = useIsTouchDevice()

  const setLenis = useStore(({ setLenis }) => setLenis)
  const lenis = useStore(({ lenis }) => lenis)

  useLayoutEffect(() => {
    if (isTouchDevice === undefined) return
    const lenis = new Lenis({ lerp: 0.1, smooth: !isTouchDevice })
    setLenis(lenis)

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        return lenis.scroll
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }
      },
    })
    lenis.on('scroll', () => ScrollTrigger.update())

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
      <div className={cn(`theme-${theme}`, s.layout, className)}>
        {isTouchDevice === false && <Cursor />}
        <Header />
        <main className={s.main}>{children}</main>
        <Footer />
      </div>
    </>
  )
}
