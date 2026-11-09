import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'

import { TAGS } from './constants'
import { isValidShopifySignature } from './webhook-signature'

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
  const secret = env.SHOPIFY_REVALIDATION_SECRET
  if (!secret) {
    console.error('SHOPIFY_REVALIDATION_SECRET is not set.')
    return NextResponse.json(
      { data: null, error: 'Webhook secret not configured' },
      { status: 503 }
    )
  }

  const rawBody = new Uint8Array(await req.arrayBuffer())
  if (
    !isValidShopifySignature(
      rawBody,
      req.headers.get('x-shopify-hmac-sha256'),
      secret
    )
  ) {
    console.error('Invalid Shopify webhook signature.')
    return NextResponse.json(
      { data: null, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const topic = req.headers.get('x-shopify-topic') ?? 'unknown'
  const isCollectionUpdate = collectionWebhooks.has(topic)
  const isProductUpdate = productWebhooks.has(topic)
  const isPageUpdate = pageWebhooks.has(topic)

  if (!(isCollectionUpdate || isProductUpdate || isPageUpdate)) {
    return NextResponse.json({
      data: { revalidated: false, now: Date.now() },
      error: null,
    })
  }

  // `expire: 0`, not `max`: the next visit after a price or stock change gets
  // fresh data, not one more stale page.
  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections, { expire: 0 })
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products, { expire: 0 })
  }

  if (isPageUpdate) {
    revalidateTag(TAGS.pages, { expire: 0 })
  }

  return NextResponse.json({
    data: { revalidated: true, now: Date.now() },
    error: null,
  })
}
