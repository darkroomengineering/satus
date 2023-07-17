import { RealViewport } from 'components/real-viewport'
import { DeviceDetectionProvider } from 'context/device-detection.context'
import { TheatreProvider } from 'context/theatre.context'
import { GTM_ID } from 'libs/analytics'
import { Orchestra } from 'libs/orchestra'
import Script from 'next/script'

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
        <link rel="manifest" href="/site.webmanifest" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" href="/favicon.ico" />
        {/* END FAVICON */}
      </head>
      <body suppressHydrationWarning>
        <RealViewport />
        <DeviceDetectionProvider>
          <TheatreProvider>
            {children}
            <Orchestra />
          </TheatreProvider>
        </DeviceDetectionProvider>
      </body>
      {/* Google Tag Manager - Global base code */}
      {process.env.NODE_ENV !== 'development' && (
        <>
          <Script
            async
            strategy="lazyOnload"
            src={`https://www.googletagmanager.com/gtag/js?id=${GTM_ID}`}
          />
          <Script
            id="gtm-base"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GTM_ID}');`,
            }}
          />
        </>
      )}
    </html>
  )
}
