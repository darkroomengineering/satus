import { stegaClean } from 'next-sanity'
import { notFound } from 'next/navigation'
import { Suspense, ViewTransition } from 'react'

import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isConfigured } from '@/integrations/registry'
import { sanityFetch } from '@/integrations/sanity/fetch'
import { pageExistsQuery, pageQuery } from '@/integrations/sanity/queries'
import { generateSanityMetadata } from '@/utils/metadata'

import { SanityTutorial } from './_components/tutorial'

const SLUG = 'sanity'

// `sanityFetch` sets its own caching: published reads are cached under the
// `sanity` tag until the publish webhook, draft mode reads uncached.
function fetchPage() {
  return sanityFetch({ query: pageQuery, params: { slug: SLUG } })
}

export default async function SanityPage() {
  if (!isConfigured('sanity')) {
    return (
      <Wrapper theme="light">
        <NotConfigured integration="Sanity" />
      </Wrapper>
    )
  }

  // Check existence before the Suspense boundary: once a fallback has
  // streamed with a 200, `notFound()` inside it only adds noindex, not a 404.
  //
  // Prerendered outside draft mode, so published visitors never see the
  // fallback or the reveal; only draft mode streams them. Cost: a second
  // Sanity request, kept so this example shows the Suspense and View
  // Transition pattern where it actually streams.
  const exists = await sanityFetch({
    query: pageExistsQuery,
    params: { slug: SLUG },
  })
  if (!exists) notFound()

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

  // Unpublished between the existence check and this read: too late for a
  // 404 status here, so render nothing rather than a broken tutorial.
  if (!data) return null

  return (
    <div className="flex grow items-center justify-center max-dt:dr-px-16">
      <SanityTutorial data={data} />
    </div>
  )
}

export async function generateMetadata() {
  const data = await fetchPage()

  const baseMetadata = data
    ? generateSanityMetadata({
        document: stegaClean(data),
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
