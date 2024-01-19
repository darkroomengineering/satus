import { RealViewport } from 'components/real-viewport'
import { DeviceDetectionProvider } from 'context/device-detection.context'

import 'styles/global.scss'

export const metadata = {
  title: 'Layout Title',
  description: 'Layout Description',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <meta name="referrer" content="no-referrer" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="geo.region" content="US" />

        {/* START FAVICON */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* END FAVICON */}

      </head>
      <body>
        <RealViewport />
        <DeviceDetectionProvider>
          {children}
        </DeviceDetectionProvider>
      </body>
    </html>
  )
}
