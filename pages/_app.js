import 'styles/global.scss'
import { Header } from 'components/header_'
import { RealViewport } from 'components/real-viewport'
import { Cursor } from 'components/cursor_'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'
import { useMediaQuery } from 'hooks/use-media-query'
import { useLayoutEffect } from 'react'
import { useStore } from 'lib/store'

function MyApp({ Component, pageProps }) {
  const isTouchDevice = useIsTouchDevice()
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const setTheme = useStore((state) => state.setTheme)

  useLayoutEffect(() => {
    setTheme(isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  return (
    <>
      <RealViewport />
      {isTouchDevice === false && <Cursor />}
      <Header />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
