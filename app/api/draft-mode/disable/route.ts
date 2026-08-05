import { draftMode } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Exit-preview links are same-origin navigations (absent/same-origin/same-site/
  // none Sec-Fetch-Site), including direct address-bar navigation where the
  // header is omitted entirely. A cross-site GET (e.g. an <img> or link on a
  // third-party page) shouldn't be able to flip draft mode off, so reject it
  // before anything else — including before the prefetch check, so cross-site
  // requests always see 403 regardless of what headers they carry.
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite === 'cross-site') {
    return new Response('Forbidden', { status: 403 })
  }

  // Route handlers execute on router prefetches too. A speculative fetch of
  // this route must never disable draft mode — that strips the bypass cookie
  // out from under an open Presentation preview, and every subsequent request
  // from the iframe bounces to the gate or sign-in. Only a real document
  // navigation (a click on the pill) may disable. Document navigations carry
  // none of these headers; prefetch/RSC fetches always carry at least one.
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
