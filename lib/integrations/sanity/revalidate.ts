import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

// This is called from `app/api/revalidate/route.ts` so providers can control
// revalidation logic — the same split Shopify uses in `./../shopify/revalidate`.
// Keeping the handler here (rather than inline in the route) means dropping
// Sanity deletes this file with the rest of `lib/integrations/sanity`, instead
// of `setup:project` having to surgically strip a 40-line try block out of a
// route two integrations share (P-B7).
export async function revalidate(request: NextRequest): Promise<NextResponse> {
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
