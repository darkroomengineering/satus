import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isConfigured } from '@/integrations/registry'
import { sanityFetch } from '@/integrations/sanity/live'
import { pageQuery } from '@/integrations/sanity/queries'
import { generateSanityMetadata } from '@/utils/metadata'
import { SanityTutorial } from './_components/tutorial'

const SLUG = 'sanity'

// `sanityFetch` calls `cacheTag()` internally, which under Cache Components
// (`cacheComponents: true`) is only legal inside a `'use cache'` function —
// including in draft mode. The official next-sanity pattern: always fetch
// inside 'use cache', but pass `perspective`/`stega` as arguments so they are
// part of the cache key, and branch on `draftMode()` at the request level.
// Live edits then land via SanityLive tag revalidation.
async function fetchPage(perspective: 'published' | 'drafts', stega: boolean) {
  'use cache'
  return sanityFetch({
    query: pageQuery,
    params: { slug: SLUG },
    perspective,
    stega,
  })
}

async function fetchPageForRequest() {
  const { isEnabled: isDraftMode } = await draftMode()
  return isDraftMode ? fetchPage('drafts', true) : fetchPage('published', false)
}

export default async function SanityPage() {
  // Show setup instructions if Sanity is not configured
  if (!isConfigured('sanity')) {
    return (
      <Wrapper theme="light">
        <NotConfigured integration="Sanity" />
      </Wrapper>
    )
  }

  const { data } = await fetchPageForRequest()

  if (!data) return notFound()

  return (
    <Wrapper theme="light" className="font-mono uppercase">
      <div className="max-dt:dr-px-16 flex grow items-center justify-center">
        <SanityTutorial data={data} />
      </div>
    </Wrapper>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata() {
  const { data } = await fetchPageForRequest()

  if (!data) return

  return generateSanityMetadata({
    document: data,
    url: '/sanity',
    type: 'website',
  })
}
