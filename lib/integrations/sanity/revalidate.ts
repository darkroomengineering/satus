import { parseBody } from 'next-sanity/webhook'
import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'

import { SANITY_CACHE_TAG } from './published'

// Called from `app/api/revalidate/route.ts`, like Shopify's. Kept out of the
// route so dropping Sanity deletes this file with its folder instead of
// `setup:project` stripping a try block out of a route two integrations share.
export async function revalidate(request: NextRequest): Promise<NextResponse> {
  try {
    const secret = env.SANITY_REVALIDATE_SECRET
    if (!secret) {
      return NextResponse.json(
        { data: null, error: 'Webhook secret not configured' },
        { status: 503 }
      )
    }

    // `true` is `waitForContentLakeEventualConsistency`: a fixed 3 s sleep
    // after a valid signature, hedging against replication lag (a query sent
    // the instant the webhook fires can still get the old version). Published
    // reads skip the API CDN (`useCdn: false` in `./client.ts`), so no CDN lag
    // stacks on top. Cost: every webhook call holds the request open 3 s, and
    // a longer lag still caches stale content until the next publish.
    const { isValidSignature } = await parseBody(request, secret, true)

    if (!isValidSignature) {
      return NextResponse.json(
        { data: null, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // One tag covers every Sanity read (`./published.ts`), so any publish
    // refreshes every page. `expire: 0`, not `max`: the next visit gets fresh
    // content, not one more stale page.
    revalidateTag(SANITY_CACHE_TAG, { expire: 0 })

    return NextResponse.json({
      data: { revalidated: true, now: Date.now() },
      error: null,
    })
  } catch (error) {
    // parseBody() throws a SyntaxError on malformed JSON after signature
    // validation. A client-input problem, so 400 rather than a 5xx that
    // triggers retries and alarms.
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
