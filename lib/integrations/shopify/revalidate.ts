import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { env } from '@/lib/env'

import { TAGS } from './constants'
import {
  createSeenSet,
  isFreshShopifyWebhook,
  isValidShopifySignature,
  isWellFormedShopifySignature,
} from './webhook-signature'

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

// SHORTCUT: per-instance memory. ceiling: serverless instances do not share it,
// so a replay that lands on another instance is not deduplicated; the
// freshness check is the protection that holds across instances. upgrade:
// move the set to a shared store (Redis, KV) if replays inside the freshness
// window start to matter.
const seenDeliveries = createSeenSet()

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

  const signature = req.headers.get('x-shopify-hmac-sha256')
  if (
    !isWellFormedShopifySignature(signature) ||
    !isValidShopifySignature(
      new Uint8Array(await req.arrayBuffer()),
      signature,
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
  let group: 'collections' | 'products' | 'pages' | null = null
  if (collectionWebhooks.has(topic)) group = 'collections'
  else if (productWebhooks.has(topic)) group = 'products'
  else if (pageWebhooks.has(topic)) group = 'pages'

  // 200 with no action, not an error: Shopify retries non-2xx responses and
  // keeps the original trigger time, so a late delivery can never succeed, and
  // repeated failures can get the subscription removed.
  const noAction = () =>
    NextResponse.json({
      data: { revalidated: false, now: Date.now() },
      error: null,
    })

  // An unrecognized topic does nothing, so it records nothing: the same signed
  // body sent later with a real topic must still revalidate.
  if (!group) return noAction()

  // The timestamp and webhook id headers are not signed, so they only stop a
  // verbatim replay.
  if (!isFreshShopifyWebhook(req.headers.get('x-shopify-triggered-at'))) {
    console.error('Stale or untimed Shopify webhook.')
    return noAction()
  }

  // The signature is bound to the body, so it dedupes a replay that rewrites
  // the webhook id. The key is the decoded digest re-encoded (decoding is
  // permissive, so the raw header has many spellings of one signature) plus
  // the tag group.
  const webhookId = req.headers.get('x-shopify-webhook-id')
  const keys = [
    `sig:${Buffer.from(signature, 'base64').toString('base64')}:${group}`,
    ...(webhookId ? [`id:${webhookId}:${group}`] : []),
  ]
  if (!seenDeliveries.rememberAll(keys)) return noAction()

  // `expire: 0`, not `max`: the next visit after a price or stock change gets
  // fresh data, not one more stale page.
  try {
    revalidateTag(TAGS[group], { expire: 0 })
  } catch (error) {
    seenDeliveries.forget(keys)
    throw error
  }

  return NextResponse.json({
    data: { revalidated: true, now: Date.now() },
    error: null,
  })
}
