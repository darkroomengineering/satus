import { notFound } from 'next/navigation'
import { fetchStoryblokStory } from '~/intergrations/storyblok'
import { StoryblokContextProvider } from '~/intergrations/storyblok/context'
import { Wrapper } from '../(components)/wrapper'
import { Tutorial } from './(component)/tutorial'

const SLUG = 'cdn/stories/home'

export default async function Storyblok() {
  const { data } = await fetchStoryblokStory(SLUG)

  if (!data) return notFound()

  return (
    <StoryblokContextProvider {...data}>
      <Wrapper theme="red" className="uppercase font-mono">
        <div className="flex items-center justify-center grow max-dt:dr-px-16">
          <Tutorial />
        </div>
      </Wrapper>
    </StoryblokContextProvider>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata() {
  const { data } = await fetchStoryblokStory(SLUG)
  const metadata = data?.story?.content?.metadata?.[0]

  if (!metadata) return

  return {
    title: metadata?.title,
    description: metadata?.description,
    images: metadata?.image?.filename,
    keywords: metadata?.keywords?.value,
    openGraph: {
      title: metadata?.title,
      description: metadata?.description,
      images: metadata?.image?.filename,
      url: process.env.NEXT_PUBLIC_BASE_URL,
    },
    twitter: {
      title: metadata?.title,
      description: metadata?.description,
      images: metadata?.image?.filename,
    },
  }
}
