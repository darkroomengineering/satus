import type { NextRequest } from 'next/server'

import {
  acceptsMediaType,
  HTML_MEDIA_TYPE,
  mergeVary,
} from '@/lib/seo/content-negotiation'
import { buildMarkdownDocument } from '@/lib/seo/markdown-document'
import { MARKDOWN_SOURCE_PATH_HEADER } from '@/lib/seo/markdown-path'

export async function GET(request: NextRequest) {
  // Next keeps the browser-visible URL across a proxy rewrite, even in
  // `nextUrl`. The proxy forwards the source path and query string as one
  // upstream-only header (e.g. `/about?variant=x`) so this handler can
  // identify the route and keep params through the HTML-fallback 303.
  const sourcePath = request.headers.get(MARKDOWN_SOURCE_PATH_HEADER) ?? ''
  const queryIndex = sourcePath.indexOf('?')
  const path = queryIndex === -1 ? sourcePath : sourcePath.slice(0, queryIndex)
  const search = queryIndex === -1 ? '' : sourcePath.slice(queryIndex)
  const accept = request.headers.get('accept')
  const document = await buildMarkdownDocument(path, {
    htmlAcceptable: acceptsMediaType(accept, HTML_MEDIA_TYPE),
    search,
  })

  if (document.status === 303) {
    return Response.redirect(new URL(document.location, request.url), 303)
  }

  const headers = {
    'content-type': document.contentType,
    vary: mergeVary(null, 'Accept'),
    ...(document.status === 503 && {
      'retry-after': String(document.retryAfterSeconds),
    }),
  }

  return new Response(document.body, { status: document.status, headers })
}
