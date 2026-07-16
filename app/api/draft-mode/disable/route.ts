import { draftMode } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Exit-preview links are same-origin navigations (absent/same-origin/same-site/
  // none Sec-Fetch-Site), including direct address-bar navigation where the
  // header is omitted entirely. A cross-site GET (e.g. an <img> or link on a
  // third-party page) shouldn't be able to flip draft mode off, so reject it
  // before touching draftMode.
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite === 'cross-site') {
    return new Response('Forbidden', { status: 403 })
  }

  ;(await draftMode()).disable()
  return NextResponse.redirect(new URL('/', request.url))
}
