import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

export async function POST(request: NextRequest) {
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
