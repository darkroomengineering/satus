import 'styles/global.scss'
import { Header } from 'components/Header'
import { Footer } from 'components/Footer'
import { Scroll } from 'components/Scroll'
import { RealViewport } from 'components/RealViewport'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <RealViewport />
      <Header />
      <Scroll>
        <Component {...pageProps} />
        <Footer />
      </Scroll>
    </>
  )
}

export default MyApp
