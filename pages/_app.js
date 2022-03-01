import { useDebug, useIsTouchDevice } from '@studio-freight/hamo'
import { RealViewport } from 'components/real-viewport'
import { fetchCmsQuery } from 'contentful/api'
import { footerQuery, headerQuery } from 'contentful/queries/navigation.graphql'
import { useStore } from 'lib/store'
import dynamic from 'next/dynamic'
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
  setHeaderData(headerData)
  setFooterData(footerData)

  const debug = useDebug()

  return (
    <>
      {debug && (
        <>
          <GridDebugger />
          <Stats />
        </>
      )}
      <RealViewport />
      <Component {...pageProps} />
    </>
  )
}

MyApp.getInitialProps = async (appContext) => {
  const fetchHeader = await fetchCmsQuery(headerQuery, {
    pageId: '1undiznMddxARgAUBrTbIA',
  })
  const fetchFooter = await fetchCmsQuery(footerQuery, {
    pageId: '2vt71bLcJnbAeuLTdos1LU',
  })

  const headerData = fetchHeader.header
  const footerData = fetchFooter.footer
  console.log({ headerData }, { footerData })
  return { headerData, footerData }
}

export default MyApp
