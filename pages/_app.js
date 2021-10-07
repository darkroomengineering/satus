import 'styles/global.scss'
import { Header } from 'components/Header'
import { Footer } from 'components/Footer'
import { Scroll } from 'components/Scroll'
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
      <Scroll>
        <Component {...pageProps} />
        <Footer />
      </Scroll>
    </>
  )
}

export default MyApp
