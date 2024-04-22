import { StoryblokApi } from 'libs/storyblok'
import { StoryblokContextProvider } from 'libs/storyblok/context'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Wrapper } from '../(components)/wrapper'
import { Tutorial } from './(component)/tutorial'
import s from './storyblok.module.scss'

export default async function Storyblok() {
  const isDraftMode =
    draftMode().isEnabled || process.env.NODE_ENV === 'development'

  const { data } = await new StoryblokApi({
    draft: isDraftMode,
  })
    .get('cdn/stories/home', {
      resolve_relations: [],
    })
    .catch(() => {
      notFound()
    })

  const content = data?.story?.content

  if (!content) return

  return (
    <StoryblokContextProvider story={data.story} options={{}}>
      <Wrapper theme="red" className={s.page}>
        <div className={s.inner}>
          <Tutorial />
        </div>
      </Wrapper>
    </StoryblokContextProvider>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({}) {
  const isDraftMode =
    draftMode().isEnabled || process.env.NODE_ENV === 'development'

  const { data } = await new StoryblokApi({
    draft: isDraftMode,
  }).get('cdn/stories/home')

  const content = data?.story?.content?.metadata?.[0]

  if (!content) return

  return {
    title: content?.title,
    description: content?.description,
    images: content?.image?.filename,
    keywords: content?.keywords?.value,
    openGraph: {
      title: content?.title,
      description: content?.description,
      images: content?.image?.filename,
      url: process.env.NEXT_PUBLIC_BASE_URL,
    },
    twitter: {
      title: content?.title,
      description: content?.description,
      images: content?.image?.filename,
    },
  }
}
