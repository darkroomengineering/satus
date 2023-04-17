import { RealViewport } from '@studio-freight/compono'
import { useLenis } from '@studio-freight/react-lenis'
import { raf } from '@studio-freight/tempus'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { GTM_ID } from 'lib/analytics'
import { useStore } from 'lib/store'
import { ProjectProvider, RafDriverProvider } from 'lib/theatre'
import Script from 'next/script'
import { useEffect } from 'react'
import 'styles/global.scss'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  ScrollTrigger.defaults({ markers: process.env.NODE_ENV === 'development' })

  // merge rafs
  gsap.ticker.lagSmoothing(0)
  gsap.ticker.remove(gsap.updateRoot)
  raf.add((time) => {
    gsap.updateRoot(time / 1000)
  }, 0)

  // reset scroll position
  window.scrollTo(0, 0)
  window.history.scrollRestoration = 'manual'
}

function MyApp({ Component, pageProps }) {
  const lenis = useLenis(ScrollTrigger.update)
  useEffect(ScrollTrigger.refresh, [lenis])

  const navIsOpened = useStore(({ navIsOpened }) => navIsOpened)

  useEffect(() => {
    if (navIsOpened) {
      lenis?.stop()
    } else {
      lenis?.start()
    }
  }, [lenis, navIsOpened])

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
      {/* <PageTransition /> */}
      <RealViewport />
      <ProjectProvider
        id="Satus"
        config="/config/Satus-2023-04-17T12_55_21.json"
      >
        <RafDriverProvider id="default">
          <Component {...pageProps} />
        </RafDriverProvider>
      </ProjectProvider>
    </>
  )
}

export default MyApp
