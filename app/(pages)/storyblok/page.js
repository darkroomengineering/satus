import { StoryblokApi } from 'libs/storyblok'
import { StoryblokContextProvider } from 'libs/storyblok/context'
import { draftMode } from 'next/headers'
import { Wrapper } from '../(components)/wrapper'
import { Tutorial } from './(component)/tutorial'
import s from './storyblok.module.scss'

export default async function Storyblok() {
  const isDraftMode =
    draftMode().isEnabled || process.env.NODE_ENV === 'development'

  const { data } = await new StoryblokApi({
    draft: isDraftMode,
  }).get('cdn/stories/home', {
    resolve_relations: [],
  })

  if (!data?.story) return

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
