/* eslint-disable @next/next/no-document-import-in-page */
import Document, { Head, Html, Main, NextScript } from 'next/document'

class _Document extends Document {
  render() {
    return (
      <Html lang="en">
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
          {/* // https://github.com/donavon/use-dark-mode */}
          {/* <script src="./noflash.js" /> */}
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default _Document
