import { createHash, timingSafeEqual } from 'node:crypto'

import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'

import { TAGS } from './constants'

/**
 * Constant-time secret comparison: `!==` short-circuits on the first
 * mismatched character, leaking timing an attacker can use to guess the
 * secret. `timingSafeEqual` needs equal-length buffers, so both sides are
 * hashed first, which also avoids a throw when the lengths differ.
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

// Called from `app/api/revalidate/route.ts`.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // Non-2xx responses make Shopify keep retrying the webhook.
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
