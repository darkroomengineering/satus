import { notFound } from 'next/navigation'
import { sanityFetch } from '~/integrations/sanity/live'
import { pageQuery } from '~/integrations/sanity/queries'
import { Wrapper } from '../(components)/wrapper'
import { SanityTutorial } from './(component)/tutorial'

const SLUG = 'home'

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

  const metadata = data?.metadata

  if (!metadata) return

  const baseUrl = `${process.env.NEXT_PUBLIC_BASE_URL}`
  const pageUrl = `${baseUrl}/sanity`

  return {
    metadataBase: baseUrl ? new URL(baseUrl) : undefined,
    title: metadata?.title,
    description: metadata?.description,
    alternates: {
      canonical: '/',
      languages: {
        'en-US': '/en-US',
      },
    },
    keywords: metadata?.keywords,
    openGraph: {
      title: metadata?.title,
      description: metadata?.description,
      images: [
        {
          url: metadata?.image?.asset?.url || '/og-image.png',
          width: 1200,
          height: 630,
          alt: metadata?.title,
        },
      ],
      url: pageUrl,
      siteName: 'Satūs',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      title: metadata?.title,
      description: metadata?.description,
      card: 'summary_large_image',
      images: [
        {
          url: metadata?.image?.asset?.url || '/og-image.png',
          width: 1200,
          height: 630,
          alt: metadata?.title,
        },
      ],
    },
    other: {
      'fb:app_id': process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
    },
  }
}
