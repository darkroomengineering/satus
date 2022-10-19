import { useDebug, useLayoutEffect } from '@studio-freight/hamo'
import { raf } from '@studio-freight/tempus'
import { getProject } from '@theatre/core'
import extension from '@theatre/r3f/dist/extension'
import studio from '@theatre/studio'
import { PageTransition } from 'components/page-transition'
import { RealViewport } from 'components/real-viewport'
import state from 'config/state.json'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { GTM_ID } from 'lib/analytics'
import { useStore } from 'lib/store'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import { useEffect } from 'react'
import 'styles/global.scss'

export const project = getProject('Satus', { state })

gsap.registerPlugin(ScrollTrigger)

// merge rafs
gsap.ticker.lagSmoothing(0)
gsap.ticker.remove(gsap.updateRoot)
raf.add((time) => {
  gsap.updateRoot(time / 1000)
}, 0)

const Stats = dynamic(
  () => import('components/stats').then(({ Stats }) => Stats),
  { ssr: false }
)

const GridDebugger = dynamic(
  () =>
    import('components/grid-debugger').then(({ GridDebugger }) => GridDebugger),
  { ssr: false }
)

// our Theatre.js project sheet, we'll use this later
// const demoSheet = getProject('Demo Project').sheet('Demo Sheet')

function MyApp({ Component, pageProps }) {
  const debug = useDebug()
  const lenis = useStore(({ lenis }) => lenis)
  const overflow = useStore(({ overflow }) => overflow)

  // const setHeaderData = useStore((state) => state.setHeaderData)
  // const setFooterData = useStore((state) => state.setFooterData)

  // const [isFetched, setIsFetched] = useState(false)

  // avoid infinite loop
  // if (!isFetched) {
  //   setHeaderData(headerData)
  //   setFooterData(footerData)
  //   setIsFetched(true)
  // }

  useEffect(() => {
    if (overflow) {
      lenis?.start()
      document.documentElement.style.removeProperty('overflow')
    } else {
      lenis?.stop()
      document.documentElement.style.setProperty('overflow', 'hidden')
    }
  }, [lenis, overflow])

  useLayoutEffect(() => {
    if (lenis) ScrollTrigger.refresh()
  }, [lenis])

  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual'
  }, [])

  ScrollTrigger.defaults({ markers: process.env.NODE_ENV === 'development' })

  useEffect(() => {
    //TODO: tree shake studio -> import only on debug mode
    if (debug && !studio.__initialized) {
      studio.initialize()
      studio.extend(extension)
      studio.__initialized = true

      setTimeout(() => {
        // lenis compatibility
        const theatreDOM = document.querySelector('#theatrejs-studio-root')
        if (theatreDOM) {
          theatreDOM.addEventListener('wheel', (e) => {
            e.stopPropagation()
          })
        }
      }, 1000)
    }
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
            strategy="worker"
            src={`https://www.googletagmanager.com/gtag/js?id=${GTM_ID}`}
          />
          <Script
            id="gtm-base"
            strategy="worker"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GTM_ID}');`,
            }}
          />
        </>
      )}
      <PageTransition />
      <RealViewport />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
