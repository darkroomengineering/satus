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
import { Scrollbar } from 'components/scrollbar'
import { useStore } from 'lib/store'
import { useRouter } from 'next/router'
import { useState } from 'react'
import useMeasure from 'react-use-measure'
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
  const [ref, { height }] = useMeasure({ debounce: 100 })

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    })
    setLenis(lenis)

    return () => {
      lenis.destroy()
      setLenis(null)
    }
  }, [])

  const [hash, setHash] = useState()

  useLayoutEffect(() => {
    if (lenis && hash) {
      // scroll to on hash change
      const target = document.querySelector(hash)
      lenis.scrollTo(target, { offset: -1.1 * height })
    }
  }, [lenis, hash, height])

  useLayoutEffect(() => {
    // update scroll position on page refresh based on hash
    if (router.asPath.includes('#')) {
      const hash = router.asPath.split('#').pop()
      setHash('#' + hash)
    }
  }, [router])

  useLayoutEffect(() => {
    // catch anchor links clicks
    function onClick(e) {
      e.preventDefault()
      const node = e.currentTarget
      const hash = node.href.split('#').pop()
      setHash('#' + hash)
      setTimeout(() => {
        window.location.hash = hash
      }, 0)
    }

    const internalLinks = [...document.querySelectorAll('[href]')].filter(
      (node) => node.href.includes(router.pathname + '#')
    )

    internalLinks.forEach((node) => {
      node.addEventListener('click', onClick, false)
    })

    return () => {
      internalLinks.forEach((node) => {
        node.removeEventListener('click', onClick, false)
      })
    }
  }, [])

  useFrame((time) => {
    lenis?.raf(time)
  }, [])

  return (
    <>
      <CustomHead {...seo} />
      <div className={cn(`theme-${theme}`, s.layout, className)}>
        {isTouchDevice === false && <Cursor />}
        {isTouchDevice === false && <Scrollbar />}
        <Header ref={ref} />
        <main className={s.main}>{children}</main>
        <Footer />
      </div>
    </>
  )
}
