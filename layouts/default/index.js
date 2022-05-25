import {
  useFrame,
  useIsTouchDevice,
  useLayoutEffect,
} from '@studio-freight/hamo'
import Lenis from '@studio-freight/lenis'
import cn from 'clsx'
import { Cursor } from 'components/cursor'
import { CustomHead } from 'components/custom-head'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import { useStore } from 'lib/store'
import { useRouter } from 'next/router'
import { useMeasure } from 'react-use'
import s from './layout.module.scss'

export function Layout({
  seo = { title: '', description: '', image: '', keywords: '' },
  children,
  theme = 'light',
  className,
}) {
  const isTouchDevice = useIsTouchDevice()
  const [lenis, setLenis] = useStore((state) => [state.lenis, state.setLenis])
  const router = useRouter()
  const [ref, { height }] = useMeasure()

  useLayoutEffect(() => {
    if (isTouchDevice === undefined) return
    window.scrollTo(0, 0)
    const lenis = new Lenis({ lerp: 0.1, smooth: !isTouchDevice })
    setLenis(lenis)

    function scrollTo(e) {
      e.preventDefault()

      const node = e.currentTarget
      const hash = node.href.split('#').pop()
      const selector = '#' + hash
      const target = document.querySelector(selector)
      if (!target) return
      lenis.scrollTo(target, { offset: -1.1 * height })

      window.location.hash = hash
    }

    const internalLinks = [...document.querySelectorAll('[href]')].filter(
      (node) => node.href.includes(router.pathname + '#')
    )

    internalLinks.forEach((node) => {
      node.addEventListener('click', scrollTo, false)
    })

    return () => {
      internalLinks.forEach((node) => {
        node.removeEventListener('click', scrollTo, false)
      })

      lenis.destroy()
      setLenis(null)
    }
  }, [isTouchDevice, height])

  useLayoutEffect(() => {
    if (router.asPath.includes('#') && lenis) {
      const hash = router.asPath.split('#').pop()
      const selector = '#' + hash
      const target = document.querySelector(selector)
      lenis.scrollTo(target, { offset: -1.05 * height })
    }
  }, [router, lenis, height])

  useFrame(() => {
    lenis?.raf()
  }, [])

  return (
    <>
      <CustomHead {...seo} />
      <div className={cn(`theme-${theme}`, s.layout, className)}>
        {isTouchDevice === false && <Cursor />}
        <Header headerRef={ref} />
        <main className={s.main}>{children}</main>
        <Footer />
      </div>
    </>
  )
}
