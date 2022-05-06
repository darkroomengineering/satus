import { useDebug, useIsTouchDevice } from '@studio-freight/hamo'
import { RealViewport } from 'components/real-viewport'
import { fetchCmsQuery } from 'contentful/api'
import { footerQuery, headerQuery } from 'contentful/queries/navigation.graphql'
import { GA_ID, GTM_ID } from 'lib/analytics'
import { useStore } from 'lib/store'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import { useState } from 'react'
import 'resize-observer-polyfill'
import 'styles/global.scss'
import useDarkMode from 'use-dark-mode'

const Stats = dynamic(
  () => import('components/stats').then(({ Stats }) => Stats),
  { ssr: false }
)

const GridDebugger = dynamic(
  () =>
    import('components/grid-debugger').then(({ GridDebugger }) => GridDebugger),
  { ssr: false }
)

function MyApp({ Component, pageProps, headerData, footerData }) {
  const isTouchDevice = useIsTouchDevice()
  const darkMode = useDarkMode()

  const setHeaderData = useStore((state) => state.setHeaderData)
  const setFooterData = useStore((state) => state.setFooterData)

  const [isFetched, setIsFetched] = useState(false)

  if (!isFetched) {
    setHeaderData(headerData)
    setFooterData(footerData)
    setIsFetched(true)
  }

  const debug = useDebug()

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

MyApp.getInitialProps = async ({ ctx, preview = false }) => {
  const [fetchHeader, fetchFooter] = await Promise.all([
    fetchCmsQuery(headerQuery, {
      pageId: '1undiznMddxARgAUBrTbIA',
      preview,
    }),
    fetchCmsQuery(footerQuery, {
      pageId: '2vt71bLcJnbAeuLTdos1LU',
      preview,
    }),
  ])

  const headerData = fetchHeader?.header
  const footerData = fetchFooter?.footer

  return { headerData, footerData }
}

export default MyApp
