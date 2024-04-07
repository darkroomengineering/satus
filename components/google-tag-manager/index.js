'use client'

/* eslint-disable no-unused-vars */

import Script from 'next/script'

const GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || ''
const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || ''

const pageview = (url) => {
  window.dataLayer.push({
    event: 'pageview',
    page: url,
  })
}

export function GoogleTagManager() {
  if (process.env.NODE_ENV === 'development') return null

  return (
    <>
      <Script
        async
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GTM_ID}`}
      />
      <Script
        id="gtm-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GTM_ID}');`,
        }}
      />
    </>
  )
}
