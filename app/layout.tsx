import type { PropsWithChildren } from 'react'

import { fontsVariable } from '@/lib/styles/fonts'

import '@/lib/styles/css/index.css'

/*
  Bare shell shared by the app and /studio. Everything app-specific —
  providers, metadata, JSON-LD, analytics, the satus-version script — lives
  in app/(site)/layout.tsx so /studio doesn't inherit it. Anything added here
  is a deliberate decision to ship it to Studio too.

  Font variables stay here on <html> so portaled UI (toasts, dialogs…)
  inherits them for free; /studio paying a font preload is an acceptable
  cost for that simplicity.
*/
export default function Layout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={fontsVariable}
      // Default theme rendered server-side for no-flash initial paint; the
      // client <Theme> updates data-theme per route via effect.
      data-theme="dark"
      // NOTE: data-theme is updated client-side per route, which would
      // otherwise trip a hydration warning.
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}
