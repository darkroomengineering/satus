import { Debug } from 'components/debug'
import { RealViewport } from 'components/real-viewport'
import 'styles/global.scss'
import { fonts } from '../fonts'

export const metadata = {
  title: 'Satus',
  description: '',
}

export default async function Layout({ children }) {
  return (
    <html lang="en" className={fonts.className}>
      <head></head>
      <body>
        <RealViewport />
        {children}
        <Debug />
      </body>
    </html>
  )
}
