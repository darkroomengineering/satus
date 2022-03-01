import { useDebug, useIsTouchDevice } from '@studio-freight/hamo'
import { RealViewport } from 'components/real-viewport'
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

function MyApp({ Component, pageProps }) {
  const isTouchDevice = useIsTouchDevice()
  const darkMode = useDarkMode()

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

export default MyApp
