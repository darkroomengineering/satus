import 'styles/global.scss'
import { Header } from 'components/Header'
import { RealViewport } from 'components/RealViewport'
import { Cursor } from 'components/Cursor'
import { useIsTouchDevice } from 'hooks/useIsTouchDevice'

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
