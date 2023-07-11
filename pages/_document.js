/* eslint-disable @next/next/no-document-import-in-page */
import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className={process.env.NODE_ENV === 'development' && 'dev'}>
      <Head>
        <meta charSet="UTF-8" />
        {/* <link
            href="/fonts/aeonik/AeonikPro-Bold.woff2"
            as="font"
            rel="preload prefetch"
            type="font/woff2"
            crossOrigin="anonymous"
          /> */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
