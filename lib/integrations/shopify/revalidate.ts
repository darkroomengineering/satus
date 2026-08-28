import { createHash, timingSafeEqual } from 'node:crypto'

import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'

import { TAGS } from './constants'

/**
 * Constant-time secret comparison. Plain `!==` on strings short-circuits on
 * the first mismatched character, which leaks timing information an
 * attacker can use to guess the secret byte-by-byte. `timingSafeEqual`
 * requires equal-length buffers, so both sides are hashed first — this also
 * sidesteps the case where `secret`/`env.SHOPIFY_REVALIDATION_SECRET` differ
 * in length (which would otherwise throw before the safe comparison runs).
 */
function secretsMatch(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest()
  const hashB = createHash('sha256').update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

const collectionWebhooks = new Set([
  'collections/create',
  'collections/delete',
  'collections/update',
])
const productWebhooks = new Set([
  'products/create',
  'products/delete',
  'products/update',
])
const pageWebhooks = new Set(['pages/create', 'pages/delete', 'pages/update'])

// This is called from `app/api/revalidate/route.ts` so providers can control revalidation logic.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // We always need to respond with a 200 status code to Shopify,
  // otherwise it will continue to retry the request.
  const headersList = await headers()
  const topic = headersList.get('x-shopify-topic') ?? 'unknown'
  const secret = req.nextUrl.searchParams.get('secret')
  const isCollectionUpdate = collectionWebhooks.has(topic)
  const isProductUpdate = productWebhooks.has(topic)
  const isPageUpdate = pageWebhooks.has(topic)

  if (
    !secret ||
    !env.SHOPIFY_REVALIDATION_SECRET ||
    !secretsMatch(secret, env.SHOPIFY_REVALIDATION_SECRET)
  ) {
    console.error('Invalid revalidation secret.')
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (!(isCollectionUpdate || isProductUpdate || isPageUpdate)) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({
      data: { revalidated: false, now: Date.now() },
      error: null,
    })
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections, {})
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products, {})
  }

  if (isPageUpdate) {
    revalidateTag(TAGS.pages, {})
  }

  return NextResponse.json({
    data: { revalidated: true, now: Date.now() },
    error: null,
  })
}
