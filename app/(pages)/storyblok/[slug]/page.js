import { Wrapper } from 'app/(pages)/(components)/wrapper'
import { StoryblokApi } from 'libs/storyblok'
import { StoryblokContextProvider } from 'libs/storyblok/context'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Article } from './(component)/article'
import s from './article-page.module.scss'

// https://nextjs.org/docs/app/api-reference/functions/generate-static-params

export async function generateStaticParams() {
  const { data } = await new StoryblokApi({
    draft: true,
  }).get(`cdn/stories/`, {
    starts_with: 'blog',
  })

  const stories = data?.stories

  return stories?.map(({ slug }) => ({ slug }))
}

export default async function StoryblokSubPage({ params }) {
  const isDraftMode =
    draftMode().isEnabled || process.env.NODE_ENV === 'development'

  const { data } = await new StoryblokApi({
    draft: isDraftMode,
  })
    .get(`cdn/stories/blog/${params.slug}`, {
      resolve_relations: [],
    })
    .catch(() => notFound())

  const content = data?.story?.content

  if (!content) return

  return (
    <StoryblokContextProvider story={data.story} options={{}}>
      <Wrapper theme="red" className={s.page}>
        <div className={s.inner}>
          <Article />
        </div>
      </Wrapper>
    </StoryblokContextProvider>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata

export async function generateMetadata({ params }) {
  const isDraftMode =
    draftMode().isEnabled || process.env.NODE_ENV === 'development'

  const { data } = await new StoryblokApi({
    draft: isDraftMode,
  }).get(`cdn/stories/blog/${params.slug}`)

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
