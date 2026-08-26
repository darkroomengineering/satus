import type { NextRequest } from 'next/server'

import {
  acceptsMediaType,
  HTML_MEDIA_TYPE,
  mergeVary,
} from '@/lib/seo/content-negotiation'
import { buildMarkdownDocument } from '@/lib/seo/markdown-document'
import { MARKDOWN_SOURCE_PATH_HEADER } from '@/lib/seo/markdown-path'

export async function GET(request: NextRequest) {
  // Next preserves the browser-visible URL across a proxy rewrite, including
  // in route-handler `nextUrl`. The proxy forwards the source path as an
  // upstream-only request header so the internal handler can identify it.
  const path = request.headers.get(MARKDOWN_SOURCE_PATH_HEADER) ?? ''
  const accept = request.headers.get('accept')
  const document = await buildMarkdownDocument(path, {
    htmlAcceptable: acceptsMediaType(accept, HTML_MEDIA_TYPE),
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
