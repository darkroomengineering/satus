// Security headers live in next.config.ts, not here.

import { timingSafeEqual } from 'node:crypto'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import {
  type DocumentMediaType,
  HTML_FORMAT_OVERRIDE_PARAM,
  HTML_FORMAT_OVERRIDE_VALUE,
  HTML_MEDIA_TYPE,
  MARKDOWN_MEDIA_TYPE,
  mergeVary,
  negotiateDocumentType,
} from '@/lib/seo/content-negotiation'
import {
  MARKDOWN_HANDLER_PATH,
  MARKDOWN_SOURCE_PATH_HEADER,
  routePathFromMarkdown,
} from '@/lib/seo/markdown-path'
import {
  getClientIP,
  isRateLimited,
  rateLimit,
  rateLimiters,
} from '@/lib/utils/rate-limit'

/**
 * Paths excluded from page-document negotiation that neither the `matcher`
 * nor `FILE_EXTENSION` covers. Only `/agent-content` qualifies: without it a
 * request there would be negotiated and could rewrite to itself. Exported for
 * the parity test in `proxy.test.ts`; `vercel.json`'s route `src` encodes the
 * same exclusions independently.
 */
export const MACHINE_PATHS = new Set([MARKDOWN_HANDLER_PATH])

export const FILE_EXTENSION = /\/[^/]+\.[^/]+$/
// Proxy response headers are applied to the rendered response. Include the
// router cache keys that Next emits so adding Accept cannot replace them.
const NEXT_DOCUMENT_VARY =
  'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch'

function isRouterRequest(request: NextRequest): boolean {
  return (
    request.headers.has('rsc') ||
    request.headers.has('next-router-prefetch') ||
    request.headers.has('next-router-state-tree') ||
    request.headers.has('next-router-segment-prefetch') ||
    request.headers.get('sec-purpose')?.includes('prefetch') === true ||
    request.headers.get('purpose') === 'prefetch'
  )
}

function isPageDocumentRequest(
  request: NextRequest,
  isMarkdownPath: boolean
): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false
  if (request.nextUrl.pathname.startsWith('/api/')) return false
  if (request.nextUrl.pathname.startsWith('/_next/')) return false
  if (MACHINE_PATHS.has(request.nextUrl.pathname)) return false
  if (isRouterRequest(request)) return false
  if (!isMarkdownPath && FILE_EXTENSION.test(request.nextUrl.pathname)) {
    return false
  }

  return true
}

/**
 * An explicit `.md` alias beats Accept (e2e: "explicit Markdown aliases
 * without an Accept header"); the HTML override beats both to break the
 * redirect loop described in `proxy()`.
 */
function resolveSelectedType(
  request: NextRequest,
  markdownRoute: string | null,
  isHtmlFormatOverride: boolean
): DocumentMediaType | null {
  if (isHtmlFormatOverride) return HTML_MEDIA_TYPE
  if (markdownRoute !== null) return MARKDOWN_MEDIA_TYPE
  return negotiateDocumentType(request.headers.get('accept'))
}

/**
 * `vercel.json` also appends `Accept` to Vary, so a response can carry it
 * twice; that is spec-legal. Both are needed: this sets Vary from the real
 * negotiation outcome, and the CDN append covers responses served from cache
 * before the proxy runs.
 */
function addAcceptVary(
  response: NextResponse,
  existingVary = response.headers.get('vary')
): NextResponse {
  response.headers.set('vary', mergeVary(existingVary, 'Accept'))
  return response
}

/**
 * Checks an `Authorization` header against the site password. Any username
 * passes; only the part after the first `:` is compared, so a password may
 * itself contain colons. The comparison always runs over the password's own
 * bytes (against itself when the lengths differ), so its timing depends only
 * on the password's length, never on what was sent.
 */
export function isSiteUnlocked(
  authorization: string | null,
  password: string
): boolean {
  if (!authorization?.startsWith('Basic ')) return false
  const credentials = Buffer.from(authorization.slice(6), 'base64').toString()
  const given = credentials.slice(credentials.indexOf(':') + 1)
  const expected = Buffer.from(password)
  const actual = Buffer.from(given)
  const sameLength = actual.length === expected.length
  return timingSafeEqual(sameLength ? actual : expected, expected) && sameLength
}

/**
 * Routes that stay open while the gate is on, because what calls them cannot
 * answer a Basic auth prompt. Each checks its own secret: the publish webhook,
 * and Presentation's draft-mode handshake. Every other `/api/*` route is gated
 * like a page; `/api/cart/ensure` is same-origin, so the browser resends the
 * credentials it already has.
 */
function isGateOpen(pathname: string): boolean {
  return (
    pathname === '/api/revalidate' || pathname.startsWith('/api/draft-mode/')
  )
}

/**
 * Pre-launch gate: with `SITE_PASSWORD` set, every response answers 401 until
 * the browser's Basic auth prompt gets the password. It runs on Vercel and on
 * a self-hosted `next start` alike; only `next dev` (`NODE_ENV` development)
 * and a `vercel env pull` checkout (`VERCEL_ENV` development) skip it. CI
 * deletes the env files before e2e, so it never sees a password.
 *
 * Costs, accepted while a site is private:
 * - Paths the `matcher` skips never reach this function: `/_next/static`
 *   (every client chunk, with each `NEXT_PUBLIC_*` value inlined), images and
 *   fonts in `public/`, the `app/` icons and share images, robots.txt and
 *   sitemap.xml. A URL with one of those extensions that matches no file
 *   renders the 404 page, site header and footer included. Gating them means
 *   running this function on every asset request of every site, gate or not.
 * - Link unfurlers and the Lighthouse workflow get the 401.
 * - On Vercel the proxy runs before the CDN cache, so a cached page is gated
 *   too. A CDN in front of a self-hosted `next start` may cache an
 *   authenticated 200 (prerendered pages send `s-maxage`) and serve it to
 *   everyone; bypass that CDN's cache while the gate is on.
 * - Wrong passwords are limited per IP (`rateLimiters.strict`, see
 *   `checkSitePassword`), in memory per instance like every limit here: it
 *   slows guessing, it does not stop a determined guesser. A long random
 *   password does.
 */
function passwordGate(request: NextRequest): NextResponse | null {
  if (!env.SITE_PASSWORD) return null
  if (env.NODE_ENV === 'development' || env.VERCEL_ENV === 'development') {
    return null
  }
  return checkSitePassword(request, env.SITE_PASSWORD)
}

/**
 * The gate's answer for one request: `null` lets it through. An IP that sent
 * too many wrong passwords gets 429 before the password is compared, so a
 * right guess made while locked out learns nothing. Only a wrong password
 * counts toward that: the first visit, with no header yet, is how the prompt
 * appears, and a shared office IP must not lock itself out by opening pages.
 */
export function checkSitePassword(
  request: NextRequest,
  password: string
): NextResponse | null {
  if (isGateOpen(request.nextUrl.pathname)) return null

  const authorization = request.headers.get('authorization')
  const ip = authorization ? getClientIP(request) : null
  if (ip && isRateLimited(`gate:${ip}`, rateLimiters.strict)) {
    return new NextResponse('Too many attempts.\n', {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
      },
    })
  }

  if (isSiteUnlocked(authorization, password)) return null
  if (ip) rateLimit(`gate:${ip}`, rateLimiters.strict)

  return new NextResponse('Password required.\n', {
    status: 401,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
      'www-authenticate': 'Basic realm="Private site", charset="UTF-8"',
    },
  })
}

export function proxy(request: NextRequest) {
  const gate = passwordGate(request)
  if (gate) return gate

  // Rate limit API routes. Not the revalidation webhook: its secret check is
  // its gate (see `app/api/revalidate/route.ts`), and a bulk publish from one
  // provider IP would trip this limit and leave the site stale.
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    request.nextUrl.pathname !== '/api/revalidate'
  ) {
    const ip = getClientIP(request)
    if (ip) {
      const result = rateLimit(`api:${ip}`, rateLimiters.relaxed)

      if (!result.success) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'Retry-After': String(result.resetIn),
              'X-RateLimit-Limit': String(result.limit),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
    }
  }

  if (request.nextUrl.pathname === MARKDOWN_HANDLER_PATH) {
    return new NextResponse('Not found.\n', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const markdownRoute = routePathFromMarkdown(request.nextUrl.pathname)
  if (!isPageDocumentRequest(request, markdownRoute !== null)) {
    return NextResponse.next()
  }

  // The markdown handler redirects here with this param when a page has no
  // Markdown representation (`lib/seo/markdown-document.ts`). Forcing HTML
  // instead of renegotiating stops the same Accept header looping forever.
  const isHtmlFormatOverride =
    markdownRoute === null &&
    request.nextUrl.searchParams.get(HTML_FORMAT_OVERRIDE_PARAM) ===
      HTML_FORMAT_OVERRIDE_VALUE

  const selectedType = resolveSelectedType(
    request,
    markdownRoute,
    isHtmlFormatOverride
  )

  if (selectedType === null) {
    return new NextResponse(
      'Not acceptable. Available representations: text/html, text/markdown.\n',
      {
        status: 406,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          vary: 'Accept',
        },
      }
    )
  }

  if (selectedType === MARKDOWN_MEDIA_TYPE) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = MARKDOWN_HANDLER_PATH
    rewriteUrl.search = ''
    // Keep the original query so the HTML-fallback 303 in
    // markdown-document.ts can merge `format=html` into it.
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(
      MARKDOWN_SOURCE_PATH_HEADER,
      (markdownRoute ?? request.nextUrl.pathname) + request.nextUrl.search
    )

    return addAcceptVary(
      NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      })
    )
  }

  return addAcceptVary(NextResponse.next(), NEXT_DOCUMENT_VARY)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
