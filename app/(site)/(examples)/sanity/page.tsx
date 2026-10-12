import { notFound } from 'next/navigation'
import { Suspense, ViewTransition } from 'react'

import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isConfigured } from '@/integrations/registry'
import { sanityFetch } from '@/integrations/sanity/fetch'
import { pageQuery } from '@/integrations/sanity/queries'
import { generateSanityMetadata } from '@/utils/metadata'

import { SanityTutorial } from './_components/tutorial'

const SLUG = 'sanity'

// `sanityFetch` owns its cache boundary: published reads are cached under the
// `sanity` tag until the publish webhook, draft mode reads uncached. Call it
// directly, no `'use cache'` wrapper needed.
function fetchPage() {
  return sanityFetch({ query: pageQuery, params: { slug: SLUG } })
}

export default function SanityPage() {
  // Show setup instructions if Sanity is not configured
  if (!isConfigured('sanity')) {
    return (
      <Wrapper theme="light">
        <NotConfigured integration="Sanity" />
      </Wrapper>
    )
  }

  return (
    <Wrapper theme="light" className="font-mono uppercase">
      <ViewTransition default="none" update="content-reveal">
        <Suspense
          fallback={
            <output
              aria-busy="true"
              className="flex grow items-center justify-center dr-p-16"
            >
              Loading content…
            </output>
          }
        >
          <SanityContent />
        </Suspense>
      </ViewTransition>
    </Wrapper>
  )
}

async function SanityContent() {
  const data = await fetchPage()

  if (!data) return notFound()

  return (
    <div className="flex grow items-center justify-center max-dt:dr-px-16">
      <SanityTutorial data={data} />
    </div>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata() {
  const data = await fetchPage()

  const baseMetadata = data
    ? generateSanityMetadata({
        document: data,
        url: '/sanity',
        type: 'website',
      })
    : {}

  // A Sanity wiring tutorial for developers, not real site content — see
  // lib/seo/routes.ts for why it's also excluded from the sitemap/llms.txt
  // catalog. noindex, not a robots.txt disallow: a crawl block would
  // prevent this directive from ever being read.
  return { ...baseMetadata, robots: { index: false, follow: false } }
}
