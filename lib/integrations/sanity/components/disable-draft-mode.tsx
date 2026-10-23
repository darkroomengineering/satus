'use client'

import { useVisualEditingEnvironment } from 'next-sanity/hooks'
import { usePathname } from 'next/navigation'

export function DisableDraftMode() {
  const environment = useVisualEditingEnvironment()
  const pathname = usePathname()

  // The hook reports `null` until the Presentation handshake resolves, so
  // anything but an explicit 'standalone' must render nothing, or the pill
  // would flash inside the Presentation iframe.
  if (environment !== 'standalone') {
    return null
  }

  // 'standalone' alone doesn't rule out Presentation: the hook falls back to
  // it after 1s in an iframe/popup whose handshake is still pending
  // (@sanity/visual-editing). Hide the pill in any framed or opened context.
  // `window` is safe here: the hook returns null on the server and first paint.
  if (window.self !== window.top || window.opener !== null) {
    return null
  }

  if (pathname.startsWith('/studio')) {
    return null
  }

  // Plain <a>, never a router Link: prefetching this href runs the route
  // handler and strips the draft cookies from an open preview. Draft mode may
  // only be disabled by a real click.
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
