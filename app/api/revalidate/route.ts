import { type NextRequest, NextResponse } from 'next/server'

import { revalidate as sanityRevalidate } from '@/integrations/sanity/revalidate'
import { revalidate as shopifyRevalidate } from '@/integrations/shopify/revalidate'

// Single documented webhook endpoint for every integration that revalidates
// cached content. Each provider owns its handler in its own integration folder
// and gets one guard + dispatch pair here, so `setup:project` strips a dropped
// provider by removing its import, guard, and dispatch — never by rewriting the
// handler body. The fallback below belongs to no provider and always survives.
//
// Not rate limited, here or in `proxy.ts`: each provider checks its secret
// before it does any work. A request carrying neither provider's signal gets
// the 404 below without its body being read. A wrong Sanity signature costs
// one HMAC, with no wait and no revalidation; a wrong Shopify secret is a
// query param compared in constant time, with no body read. A per-IP limit
// would mostly turn away the providers themselves during a bulk publish,
// leaving the site stale. Cost: anyone can make this route run those checks
// as often as they like.
export async function POST(request: NextRequest) {
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
