import {
  useDebug,
  useIsTouchDevice,
  useLayoutEffect,
} from '@studio-freight/hamo'
import { RealViewport } from 'components/real-viewport'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { GA_ID, GTM_ID } from 'lib/analytics'
import { useStore } from 'lib/store'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import { useEffect, useRef } from 'react'
import 'resize-observer-polyfill'
import 'styles/global.scss'
import useDarkMode from 'use-dark-mode'
gsap.registerPlugin(ScrollTrigger)

const Stats = dynamic(
  () => import('components/stats').then(({ Stats }) => Stats),
  { ssr: false }
)

const GridDebugger = dynamic(
  () =>
    import('components/grid-debugger').then(({ GridDebugger }) => GridDebugger),
  { ssr: false }
)

function MyApp({ Component, pageProps }) {
  const isTouchDevice = useIsTouchDevice()
  const darkMode = useDarkMode()

  const debug = useDebug()

  const lenis = useStore(({ lenis }) => lenis)
  const overflow = useStore(({ overflow }) => overflow)

  useEffect(() => {
    if (overflow) {
      lenis?.start()
      console.log('visible')
      document.documentElement.style.removeProperty('overflow')
    } else {
      lenis?.stop()
      console.log('hidden')
      document.documentElement.style.setProperty('overflow', 'hidden')
    }

    console.log({ overflow })
  }, [lenis, overflow])

  // no way to destory scrollerProxy, so use a ref
  const lenisRef = useRef()

  useLayoutEffect(() => {
    // update ScrollTrigger position
    if (!lenis) return
    lenisRef.current = lenis
    lenis.on('scroll', () => ScrollTrigger.update())
    ScrollTrigger.refresh()
  }, [lenis])

  useLayoutEffect(() => {
    // reset scroll position on page refresh
    window.history.scrollRestoration = 'manual'

    if (!lenisRef.current) return
    // set scroller proxy
    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value) {
        return lenisRef.current.scroll
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
  }, [])

  useLayoutEffect(() => {
    ScrollTrigger.defaults({ markers: debug })
  }, [debug])

  return (
    <>
      {debug && (
        <>
          <GridDebugger />
          <Stats />
        </>
      )}
      {/* Google Tag Manager - Global base code */}
      {process.env.NODE_ENV !== 'development' && (
        <>
          <Script
            async
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GTM_ID}`}
          />
          <Script
            id="gtm-base"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src= 'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f); })(window,document,'script','dataLayer','${GTM_ID}');
          `,
            }}
          />
          <Script
            id="ga-base"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `,
            }}
          />
        </>
      )}
      <RealViewport />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
