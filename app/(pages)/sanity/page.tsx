import { notFound } from 'next/navigation'
import { sanityFetch } from '~/integrations/sanity/live'
import { pageQuery } from '~/integrations/sanity/queries'
import { generateSanityMetadata } from '~/libs/metadata'
import { Wrapper } from '../(components)/wrapper'
import { SanityTutorial } from './(component)/tutorial'

const SLUG = 'sanity'

export default async function SanityPage() {
  const { data } = await sanityFetch({
    query: pageQuery,
    params: { slug: SLUG },
  })

  if (!data) return notFound()

  return (
    <Wrapper theme="red" className="uppercase font-mono">
      <div className="flex items-center justify-center grow max-dt:dr-px-16">
        <SanityTutorial data={data} />
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
