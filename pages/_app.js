import { RealViewport } from '@studio-freight/compono'
import { useLenis } from '@studio-freight/react-lenis'
import Tempus from '@studio-freight/tempus'
import { DeviceDetectionProvider } from 'components/device-detection'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { GTM_ID } from 'libs/analytics'
import { useOrchestra } from 'libs/orchestra/react'
import { useStore } from 'libs/store'
import { ProjectProvider, RafDriverProvider } from 'libs/theatre'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import { useEffect } from 'react'
import 'styles/global.scss'

const Studio = dynamic(
  () => import('libs/theatre/studio').then(({ Studio }) => Studio),
  { ssr: false },
)
const Stats = dynamic(
  () => import('libs/orchestra/stats').then(({ Stats }) => Stats),
  {
    ssr: false,
  },
)
const GridDebugger = dynamic(
  () => import('libs/orchestra/grid').then(({ GridDebugger }) => GridDebugger),
  {
    ssr: false,
  },
)

if (typeof window !== 'undefined') {
  // reset scroll position
  window.scrollTo(0, 0)
  window.history.scrollRestoration = 'manual'

  gsap.defaults({ ease: 'none' })
  gsap.registerPlugin(ScrollTrigger)
  ScrollTrigger.clearScrollMemory(window.history.scrollRestoration)
  ScrollTrigger.defaults({ markers: process.env.NODE_ENV === 'development' })

  // merge rafs
  gsap.ticker.lagSmoothing(0)
  gsap.ticker.remove(gsap.updateRoot)
  Tempus?.add((time) => {
    gsap.updateRoot(time / 1000)
  }, 0)
}

function MyApp({ Component, pageProps }) {
  const lenis = useLenis(ScrollTrigger.update)
  useEffect(() => ScrollTrigger.refresh(), [lenis])

  const isNavOpened = useStore(({ isNavOpened }) => isNavOpened)

  useEffect(() => {
    if (isNavOpened) {
      lenis?.stop()
    } else {
      lenis?.start()
    }
  }, [lenis, isNavOpened])

  const { stats, grid, studio, dev } = useOrchestra()

  return (
    <>
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
      <RealViewport />
      <DeviceDetectionProvider>
        <ProjectProvider
          id="Satus"
          config="/config/Satus-2023-04-17T12_55_21.json"
        >
          <RafDriverProvider id="default">
            <Component {...pageProps} />
            {studio && <Studio />}
            {stats && <Stats />}
            {grid && <GridDebugger />}
            {typeof document !== 'undefined' &&
              document.documentElement.classList.toggle('dev', Boolean(dev))}
          </RafDriverProvider>
        </ProjectProvider>
      </DeviceDetectionProvider>
    </>
  )
}

export default MyApp
