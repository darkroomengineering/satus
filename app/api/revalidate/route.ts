import { type NextRequest, NextResponse } from 'next/server'

import { revalidate as sanityRevalidate } from '@/integrations/sanity/revalidate'
import { revalidate as shopifyRevalidate } from '@/integrations/shopify/revalidate'
import { getClientIP, rateLimit, rateLimiters } from '@/lib/utils/rate-limit'

// Single documented webhook endpoint for every integration that revalidates
// cached content. Each provider owns its handler in its own integration folder
// and gets one guard + dispatch pair here, so `setup:project` strips a dropped
// provider by removing its import, guard, and dispatch — never by rewriting the
// handler body. The rate limit above and the fallback below belong to no
// provider and always survive.
export async function POST(request: NextRequest) {
  // Rate limit to prevent cache flooding
  const ip = getClientIP(request)
  const rateLimitResult = rateLimit(`revalidate:${ip}`, rateLimiters.standard)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { data: null, error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.resetIn),
        },
      }
    )
  }

  // Shopify webhooks identify themselves with an `x-shopify-topic` header and
  // always carry a `secret` query param.
  const isShopifyWebhook =
    request.headers.has('x-shopify-topic') ||
    request.nextUrl.searchParams.has('secret')

  if (isShopifyWebhook) {
    return shopifyRevalidate(request)
  }

  // Sanity signs its webhook body and sends the signature in this header
  // (`sanity-webhook-signature`, the name `next-sanity/webhook`'s parseBody
  // reads); the handler validates it.
  const isSanityWebhook = request.headers.has('sanity-webhook-signature')

  if (isSanityWebhook) {
    return sanityRevalidate(request)
  }

  return NextResponse.json(
    { data: null, error: 'No webhook handler configured' },
    { status: 404 }
  )
}
