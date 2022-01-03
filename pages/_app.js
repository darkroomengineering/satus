import { RealViewport } from 'components/real-viewport'
import { useDebug } from 'hooks/use-debug'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
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

function MyApp({ Component, pageProps }) {
  const isTouchDevice = useIsTouchDevice()
  const darkMode = useDarkMode()
  const setTheme = useStore((state) => state.setTheme)

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
