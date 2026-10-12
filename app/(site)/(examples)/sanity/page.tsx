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
  // Show setup instructions if Sanity is not configured
  if (!isConfigured('sanity')) {
    return (
      <Wrapper theme="light">
        <NotConfigured integration="Sanity" />
      </Wrapper>
    )
  }

  // Check the document exists before the Suspense boundary below. Once a
  // boundary renders its fallback the response has streamed with a 200, so a
  // `notFound()` inside it only adds a noindex tag, never the 404 status.
  //
  // `/sanity` reads no request data outside draft mode, so it is prerendered:
  // for published content the boundary resolves at build or revalidation
  // time, and visitors never see the fallback or the reveal. Only draft mode
  // renders per request and streams the reveal. Cost: a second Sanity request
  // (cached alongside the page query when published, uncached in draft mode),
  // kept so this example still shows the Suspense and View Transition
  // pattern where it actually streams.
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
