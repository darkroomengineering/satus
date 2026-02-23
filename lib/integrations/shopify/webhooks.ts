import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { TAGS } from './constants'

// This is called from `app/api/revalidate.ts` so providers can control revalidation logic.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // We always need to respond with a 200 status code to Shopify,
  // otherwise it will continue to retry the request.
  const collectionWebhooks = [
    'collections/create',
    'collections/delete',
    'collections/update',
  ]
  const productWebhooks = [
    'products/create',
    'products/delete',
    'products/update',
  ]
  const headersList = await headers()
  const topic = headersList.get('x-shopify-topic') || 'unknown'
  const secret = req.nextUrl.searchParams.get('secret')
  const isCollectionUpdate = collectionWebhooks.includes(topic)
  const isProductUpdate = productWebhooks.includes(topic)

  if (!secret || secret !== process.env.SHOPIFY_REVALIDATION_SECRET) {
    console.error('Invalid revalidation secret.')
    return NextResponse.json({ status: 200 })
  }

  if (!(isCollectionUpdate || isProductUpdate)) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({ status: 200 })
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections, {})
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products, {})
  }

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() })
}
