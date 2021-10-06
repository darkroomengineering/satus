import 'styles/global.scss'
import { Header } from 'components/Header'
import { Footer } from 'components/Footer'
import { Scroll } from 'components/Scroll'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Header />
      <Scroll>
        <Component {...pageProps} />
        <Footer />
      </Scroll>
    </>
  )
}

export default MyApp
