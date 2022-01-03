import { RealViewport } from 'components/real-viewport'
import { useDebug } from 'hooks/use-debug'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
import { useMediaQuery } from 'hooks/use-media-query'
import { useStore } from 'lib/store'
import dynamic from 'next/dynamic'
import { useLayoutEffect } from 'react'
import 'resize-observer-polyfill'
import 'styles/global.scss'

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
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const setTheme = useStore((state) => state.setTheme)

  useLayoutEffect(() => {
    setTheme(isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

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
