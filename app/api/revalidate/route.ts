import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

import { revalidate as shopifyRevalidate } from '@/integrations/shopify/revalidate'
import { getClientIP, rateLimit, rateLimiters } from '@/lib/utils/rate-limit'

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
  // always carry a `secret` query param; Sanity webhooks authenticate via a
  // signed request body instead. Either signal routes to the Shopify handler
  // so this stays the single documented webhook endpoint for both integrations.
  const isShopifyWebhook =
    request.headers.has('x-shopify-topic') ||
    request.nextUrl.searchParams.has('secret')

  if (isShopifyWebhook) {
    return shopifyRevalidate(request)
  }

  try {
    const secret = process.env.SANITY_REVALIDATE_SECRET
    if (!secret) {
      return NextResponse.json(
        { data: null, error: 'Webhook secret not configured' },
        { status: 503 }
      )
    }

    const { body, isValidSignature } = await parseBody<{
      _type: string
      slug?: { current: string }
    }>(request, secret)

    if (!isValidSignature) {
      return NextResponse.json(
        { data: null, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    if (!body?._type) {
      return NextResponse.json(
        { data: null, error: 'Bad Request' },
        { status: 400 }
      )
    }

    // Revalidate the specific document type.
    // Next 16 Cache Components requires the second (cache-profile) argument;
    // an empty object selects the default revalidation behavior.
    revalidateTag(body._type, {})

    // If there's a slug, revalidate the specific page
    if (body.slug?.current) {
      revalidateTag(`${body._type}:${body.slug.current}`, {})
    }

    return NextResponse.json({
      data: { revalidated: true, now: Date.now() },
      error: null,
    })
  } catch (error) {
    // next-sanity's parseBody() runs `JSON.parse` on the raw request body
    // after signature validation; malformed JSON throws a SyntaxError here.
    // That's a client-input problem, not a server fault, so it gets a 400
    // instead of feeding 5xx-triggered retries/alarms.
    if (error instanceof SyntaxError) {
      console.warn('Revalidation client error: invalid JSON body', error)
      return NextResponse.json(
        { data: null, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    console.error('Revalidation error:', error)
    return NextResponse.json(
      { data: null, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
