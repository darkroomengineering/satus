import type { PropsWithChildren } from 'react'

import { fontsVariable } from '@/lib/styles/fonts'

import '@/lib/styles/css/index.css'

/*
  Bare shell shared by the app and /studio: app-specific providers, metadata,
  JSON-LD and analytics live in app/(site)/layout.tsx so /studio doesn't
  inherit them. Anything added here ships to Studio too.

  Font variables stay on <html> so portaled UI (toasts, dialogs) inherits
  them; /studio paying a font preload is the accepted cost.
*/
export default function Layout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={fontsVariable}
      // Server-rendered default for no-flash paint; <Theme> updates it per
      // route, hence the hydration-warning suppression.
      data-theme="dark"
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  )
}
