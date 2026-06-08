import { notFound } from 'next/navigation'
import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isConfigured } from '@/integrations/registry'
import { sanityFetch } from '@/integrations/sanity/live'
import { pageQuery } from '@/integrations/sanity/queries'
import { generateSanityMetadata } from '@/utils/metadata'
import { SanityTutorial } from './_components/tutorial'

const SLUG = 'sanity'

// `sanityFetch` calls `cacheTag()` internally, which under Next's Cache
// Components (`cacheComponents: true`) is only legal inside a `'use cache'`
// function. Wrapping here also dedupes the fetch across the page render and
// `generateMetadata`.
async function fetchPage() {
  'use cache'
  return sanityFetch({
    query: pageQuery,
    params: { slug: SLUG },
  })
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

  const { data } = await fetchPage()

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
  const { data } = await fetchPage()

  if (!data) return

  return generateSanityMetadata({
    document: data,
    url: '/sanity',
    type: 'website',
  })
}
