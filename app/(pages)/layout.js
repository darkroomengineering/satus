import { Debug } from 'components/debug'
import { GoogleTagManager } from 'components/google-tag-manager'
import { GSAP } from 'components/gsap'
import { RealViewport } from 'components/real-viewport'
import 'styles/global.scss'
import { fonts } from '../fonts'

export const metadata = {
  title: 'Satūs',
  description: 'Next.js starter',
}

export default async function Layout({ children }) {
  return (
    <html lang="en" className={fonts?.className}>
      <head></head>
      <body>
        <RealViewport />
        {children}
        <Debug />
        <GSAP />
        <GoogleTagManager />
      </body>
    </html>
  )
}
