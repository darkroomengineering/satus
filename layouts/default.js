import { Scroll } from 'components/Scroll'
import { Footer } from 'components/Footer'

export default function Layout({ children }) {
  return (
    <>
      <Scroll>
        <main>{children}</main>
        <Footer />
      </Scroll>
    </>
  )
}
