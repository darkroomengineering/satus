import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import {
  fetchAllSanityArticles,
  fetchSanityArticle,
  SanityContextProvider,
} from '~/integrations/sanity'
import { SanityArticle } from './(component)/article'

// Add ISR revalidation - revalidate every hour
export const revalidate = 3600

export async function generateStaticParams() {
  const { data } = await fetchAllSanityArticles()

  return data.map((article) => ({ slug: article.slug?.current }))
}

export default async function SanityArticlePage({ params }) {
  const { slug } = await params
  const isDraftMode = (await draftMode()).isEnabled
  const { data } = await fetchSanityArticle(slug, isDraftMode)

  if (!data) return notFound()

  return (
    <SanityContextProvider document={data} isLoading={false} error={null}>
      <Wrapper theme="red" className="uppercase font-mono">
        <div className="flex items-center justify-center grow max-dt:dr-px-16">
          <SanityArticle />
        </div>
        {isDraftMode && (
          <div className="fixed bottom-4 right-4 bg-yellow-400 text-black px-4 py-2 rounded font-mono text-sm">
            Draft Mode
          </div>
        )}
      </Wrapper>
    </SanityContextProvider>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({ params }) {
  const { slug } = await params
  const { data } = await fetchSanityArticle(slug)
  const metadata = data?.metadata

  if (!metadata) return

  const baseUrl = `${process.env.NEXT_PUBLIC_BASE_URL}`
  const pageUrl = `${baseUrl}/sanity/${slug}`

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
