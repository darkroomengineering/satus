import { notFound } from 'next/navigation'
import { fetchAll, fetchStoryblokStory } from '~/integrations/storyblok'
import { StoryblokContextProvider } from '~/integrations/storyblok/context'
import { Wrapper } from '../../(components)/wrapper'
import { Article } from './(component)/article'

// https://nextjs.org/docs/app/api-reference/functions/generate-static-params
const SLUG = 'cdn/stories/blog'

export async function generateStaticParams() {
  const { data } = await fetchAll('cdn/stories', {
    starts_with: 'blog',
  })

  return data.map(({ slug }) => ({ slug }))
}

export default async function StoryblokSubPage({ params }) {
  const { slug } = await params
  const { data } = await fetchStoryblokStory(`${SLUG}/${slug}`)

  if (!data) return notFound()

  return (
    <StoryblokContextProvider {...data}>
      <Wrapper theme="red" className="uppercase font-mono">
        <div className="flex items-center justify-center grow max-dt:dr-px-16">
          <Article />
        </div>
      </Wrapper>
    </StoryblokContextProvider>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { data } = await fetchStoryblokStory(`${SLUG}/${slug}`)
  const metadata = data?.story?.content?.metadata?.[0]

  if (!metadata) return

  const baseUrl = `${process.env.NEXT_PUBLIC_BASE_URL}`
  const pageUrl = `${baseUrl}/storyblok/${slug}`

  return {
    metadataBase: new URL(baseUrl),
    title: metadata?.title,
    description: metadata?.description,
    alternates: {
      canonical: '/',
      languages: {
        'en-US': '/en-US',
      },
    },
    keywords: metadata?.keywords?.value,
    openGraph: {
      title: metadata?.title,
      description: metadata?.description,
      images: [
        {
          url: metadata?.image?.filename || '/og-image.png',
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
          url: metadata?.image?.filename || '/og-image.png',
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
