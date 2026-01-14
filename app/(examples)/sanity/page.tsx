import { notFound } from 'next/navigation'
import { Wrapper } from '@/components/layout/wrapper'
import { NotConfigured } from '@/components/ui/not-configured'
import { isSanityConfigured } from '@/integrations/check-integration'
import { sanityFetch } from '@/integrations/sanity/live'
import { pageQuery } from '@/integrations/sanity/queries'
import type { Page } from '@/integrations/sanity/sanity.types'
import { generateSanityMetadata } from '@/utils/metadata'
import { SanityTutorial } from './_components/tutorial'

const SLUG = 'sanity'

export default async function SanityPage() {
  // Show setup instructions if Sanity is not configured
  if (!isSanityConfigured()) {
    return (
      <Wrapper theme="light">
        <NotConfigured integration="Sanity" />
      </Wrapper>
    )
  }

  const { data } = await sanityFetch({
    query: pageQuery,
    params: { slug: SLUG },
  })

  if (!data) return notFound()

  return (
    <Wrapper theme="light" className="font-mono uppercase">
      <div className="max-dt:dr-px-16 flex grow items-center justify-center">
        <SanityTutorial data={data as Page} />
      </div>
    </Wrapper>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata() {
  const { data } = await sanityFetch({
    query: pageQuery,
    params: { slug: SLUG },
  })

  if (!data) return

  return generateSanityMetadata({
    document: data,
    url: '/sanity',
    type: 'website',
  })
}
