/**
 * Next.js Request Proxy
 *
 * Replaces the deprecated middleware.ts pattern for Next.js 16+.
 * Handles cross-cutting concerns for incoming requests.
 *
 * Customize:
 * - Rate limiting: Adjust rateLimiters config per route pattern
 * - Auth: Add token/session validation before route matching
 * - Logging: Add request logging for observability
 * - CORS: Add custom CORS headers for API routes
 *
 * Note: Security headers are configured in next.config.ts (static, no need for proxy)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getClientIP, rateLimit, rateLimiters } from '@/lib/utils/rate-limit'

export function proxy(request: NextRequest) {
  // Rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = getClientIP(request)
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

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
