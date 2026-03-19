import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { getClientIP, rateLimit, rateLimiters } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit to prevent cache flooding
  const ip = getClientIP(request)
  const rateLimitResult = rateLimit(`revalidate:${ip}`, rateLimiters.standard)

  if (!rateLimitResult.success) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': String(rateLimitResult.resetIn),
      },
    })
  }

  try {
    const { body, isValidSignature } = await parseBody<{
      _type: string
      slug?: { current: string }
    }>(request, process.env.SANITY_REVALIDATE_SECRET)

    if (!isValidSignature) {
      return new Response('Invalid signature', { status: 401 })
    }

    if (!body?._type) {
      return new Response('Bad Request', { status: 400 })
    }

    // Revalidate the specific document type
    revalidateTag(body._type, {})

    // If there's a slug, revalidate the specific page
    if (body.slug?.current) {
      revalidateTag(`${body._type}:${body.slug.current}`, {})
    }

    return NextResponse.json({
      status: 200,
      revalidated: true,
      now: Date.now(),
    })
  } catch (error) {
    console.error('Revalidation error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
