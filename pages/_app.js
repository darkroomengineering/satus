import 'styles/global.scss'
import { Header } from 'components/Header'
import { RealViewport } from 'components/real-viewport'
import { Cursor } from 'components/Cursor'
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
