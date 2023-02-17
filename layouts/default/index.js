import { SmoothScrollbar, useScrollbar } from '@14islands/r3f-scroll-rig'
import { useIsTouchDevice, useLayoutEffect } from '@studio-freight/hamo'
import cn from 'clsx'
import { Cursor } from 'components/cursor'
import { CustomHead } from 'components/custom-head'
import { Footer } from 'components/footer'
import { Header } from 'components/header'
import { Scrollbar } from 'components/scrollbar'
import { useStore } from 'lib/store'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import useMeasure from 'react-use-measure'
import s from './layout.module.scss'

export function Layout({
  seo = { title: '', description: '', image: '', keywords: '' },
  children,
  theme = 'light',
  className,
}) {
  const overflow = useStore(({ overflow }) => overflow)
  const isTouchDevice = useIsTouchDevice()
  const router = useRouter()
  const [ref, { height }] = useMeasure({ debounce: 100 })
  const { scrollTo } = useScrollbar()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [hash, setHash] = useState()

  useLayoutEffect(() => {
    if (scrollTo && hash) {
      // scroll to on hash change
      // const target = document.querySelector(hash)
      // TODO: scrollTo from scrollbar is not working yet
      // scrollTo(target, {
      //   offset: -1.1 * height,
      //   duration: 10,
      //   easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      //   immediate: true,
      // })
    }
  }, [scrollTo, hash, height])

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

  useEffect(() => {
    if (overflow) {
      document.documentElement.style.removeProperty('overflow')
    } else {
      document.documentElement.style.setProperty('overflow', 'hidden')
    }
  }, [overflow])

  return (
    <>
      <CustomHead {...seo} />
      <SmoothScrollbar locked={!overflow} scrollRestoration="manual">
        {(bind) => (
          <div {...bind} className={cn(`theme-${theme}`, s.layout, className)}>
            {isTouchDevice === false && <Cursor />}
            {isTouchDevice === false && <Scrollbar />}
            <Header ref={ref} />
            <main className={s.main}>{children}</main>
            <Footer />
          </div>
        )}
      </SmoothScrollbar>
    </>
  )
}
