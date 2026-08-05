'use client'

import { useVisualEditingEnvironment } from 'next-sanity/hooks'
import { usePathname } from 'next/navigation'

export function DisableDraftMode() {
  const environment = useVisualEditingEnvironment()
  const pathname = usePathname()

  // Render ONLY once the environment has settled on 'standalone'. The hook
  // reports `null` until the Presentation comlink handshake resolves — inside
  // the Presentation iframe that means the pill would mount briefly before
  // the 'presentation-iframe' value arrives, so anything but an explicit
  // 'standalone' must render nothing.
  if (environment !== 'standalone') {
    return null
  }

  // 'standalone' alone doesn't rule out Presentation: the hook falls back to
  // 'standalone' after 1s in an iframe/popup whose handshake is still pending
  // (@sanity/visual-editing). A framed or opened context never legitimately
  // needs the pill, so hide it there regardless. Safe to read `window` here:
  // the hook returns null on the server and on first paint, so this line only
  // ever runs client-side after hydration.
  if (window.self !== window.top || window.opener !== null) {
    return null
  }

  if (pathname.startsWith('/studio')) {
    return null
  }

  // Plain <a>, never a router Link: prefetching this href executes the route
  // handler and silently strips the draft cookies out from under an open
  // preview. Disabling draft mode must only ever happen on a real click.
  return (
    // oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- deliberate bare anchor: the Link component prefetches, and a prefetch of this route handler disables draft mode (see comment above)
    <a
      href="/api/draft-mode/disable"
      className="text-sm fixed top-safe right-safe z-50 bg-red dr-p-4 font-mono text-primary uppercase"
    >
      Disable Draft Mode
    </a>
  )
}
