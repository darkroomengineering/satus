import { type NextRequest, NextResponse } from 'next/server'

import { revalidate as sanityRevalidate } from '@/integrations/sanity/revalidate'
import { revalidate as shopifyRevalidate } from '@/integrations/shopify/revalidate'

// Single webhook endpoint for every integration that revalidates cached
// content. Each provider owns its handler in its integration folder and gets
// one guard + dispatch pair here, so `setup:project` strips a dropped provider
// by removing its import, guard and dispatch, never the handler body. The
// fallback belongs to no provider and always survives. With every provider
// stripped nothing reads `request`, so it becomes `_request` (unused-parameter
// checks).
//
// Not rate limited, here or in `proxy.ts`: a per-IP limit would mostly turn
// away the providers themselves during a bulk publish, leaving the site stale.
// A request with no provider's signal gets the 404 below without its body
// being read. What a provider's request can cost before rejection is noted at
// its guard.
export async function POST(request: NextRequest) {
  // Shopify signs each webhook body and sends the signature in
  // `x-shopify-hmac-sha256`, beside an `x-shopify-topic` header; either one
  // routes here, so an unsigned Shopify request gets a 401, not the 404. The
  // handler reads the whole body (up to the platform's request body cap) and
  // HMACs it before a wrong signature is rejected. Cost: anyone can make this
  // route read and hash a body that size as often as they like.
  const isShopifyWebhook =
    request.headers.has('x-shopify-hmac-sha256') ||
    request.headers.has('x-shopify-topic')

  if (isShopifyWebhook) {
    return shopifyRevalidate(request)
  }

  // Sanity signs its webhook body and sends the signature in this header
  // (`sanity-webhook-signature`, the name `next-sanity/webhook`'s parseBody
  // reads); the handler validates it. It reads the whole body (up to the
  // platform's request body cap) and HMACs it before a wrong signature is
  // rejected, with no wait and no revalidation. Cost: anyone can make this
  // route read and hash a body that size as often as they like.
  const isSanityWebhook = request.headers.has('sanity-webhook-signature')

  if (isSanityWebhook) {
    return sanityRevalidate(request)
  }

  return NextResponse.json(
    { data: null, error: 'No webhook handler configured' },
    { status: 404 }
  )
}
