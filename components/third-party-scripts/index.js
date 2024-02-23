import { GTM_ID } from 'libs/analytics'
import Script from 'next/script'

export function ThirdPartyScripts() {
  if (process.env.NODE_ENV === 'development') return null

  return (
    <>
      <Script
        async
        strategy="worker"
        src={`https://www.googletagmanager.com/gtag/js?id=${GTM_ID}`}
      />
      <Script
        id="gtm-base"
        strategy="worker"
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
