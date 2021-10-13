import 'styles/global.scss'
import { Header } from 'components/header'
import { RealViewport } from 'components/real-viewport'
import { Cursor } from 'components/cursor'
import { useIsTouchDevice } from 'hooks/use-is-touch-device'

function MyApp({ Component, pageProps }) {
  const isTouchDevice = useIsTouchDevice()
  

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
