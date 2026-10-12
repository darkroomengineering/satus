import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

import { SANITY_CACHE_TAG } from './published'

// This is called from `app/api/revalidate/route.ts` so providers can control
// revalidation logic — the same split Shopify uses in `./../shopify/revalidate`.
// Keeping the handler here (rather than inline in the route) means dropping
// Sanity deletes this file with the rest of `lib/integrations/sanity`, instead
// of `setup:project` having to surgically strip a 40-line try block out of a
// route two integrations share (P-B7).
export async function revalidate(request: NextRequest): Promise<NextResponse> {
  try {
    const secret = env.SANITY_REVALIDATE_SECRET
    if (!secret) {
      return NextResponse.json(
        { data: null, error: 'Webhook secret not configured' },
        { status: 503 }
      )
    }

    // `true` makes parseBody sleep a fixed 3 s after a valid signature
    // (next-sanity 13.3.4); it does not check that Content Lake serves the new
    // version. What makes the refetch see it is that published reads skip the
    // API CDN (`useCdn: false` in `./client.ts`). Cost: every webhook call
    // holds the request open 3 s.
    const { isValidSignature } = await parseBody(request, secret, true)

    if (!isValidSignature) {
      return NextResponse.json(
        { data: null, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Every Sanity read carries this one tag (see `./published.ts`), so a
    // publish of any document refreshes every page. `expire: 0`, not `max`:
    // the next visit gets fresh content, not one more stale page.
    revalidateTag(SANITY_CACHE_TAG, { expire: 0 })

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
