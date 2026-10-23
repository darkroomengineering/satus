import { draftMode } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Exit-preview links are same-origin navigations (the header may be absent,
  // e.g. address-bar navigation). A cross-site GET (an <img> or link on a
  // third-party page) must not flip draft mode off. Checked before the
  // prefetch test, so cross-site requests always see 403.
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite === 'cross-site') {
    return new Response('Forbidden', { status: 403 })
  }

  // Route handlers run on router prefetches too. A speculative fetch must
  // never disable draft mode: it strips the bypass cookie from an open
  // Presentation preview and the iframe bounces to the gate or sign-in. Only a
  // real document navigation (a click on the pill) may disable; those carry
  // none of these headers, prefetch/RSC fetches carry at least one.
  const isPrefetch =
    request.headers.has('next-router-prefetch') ||
    request.headers.has('rsc') ||
    request.headers.get('sec-purpose')?.includes('prefetch') === true ||
    request.headers.get('purpose') === 'prefetch'

  if (isPrefetch) {
    return new NextResponse(null, { status: 204 })
  }

  ;(await draftMode()).disable()
  return NextResponse.redirect(new URL('/', request.url))
}
