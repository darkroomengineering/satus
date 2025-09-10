import { notFound } from 'next/navigation'
import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { sanityFetch } from '~/integrations/sanity/live'
import { articleQuery } from '~/integrations/sanity/queries'
import { SanityArticle } from './(component)/article'

// export async function generateStaticParams() {
//   const { data } = await sanityFetch({
//     query: allArticlesQuery,
//   })

//   return data.map((article) => ({ slug: article.slug?.current }))
// }

export default async function SanityArticlePage({ params }) {
  const { slug } = await params

  const { data } = await sanityFetch({
    query: articleQuery,
    params: { slug },
  })

  if (!data) return notFound()

  return (
    <Wrapper theme="red" className="uppercase font-mono">
      <div className="flex items-center justify-center grow max-dt:dr-px-16">
        <SanityArticle data={data} />
      </div>
    </Wrapper>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({ params }) {
  const { slug } = await params
  const { data } = await sanityFetch({
    query: articleQuery,
    params: { slug },
  })
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
