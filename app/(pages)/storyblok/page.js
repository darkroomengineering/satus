import { storyblokApi } from 'libs/storyblok'
import { StoryblokContextProvider } from 'libs/storyblok/context'
import { Wrapper } from '../(components)/wrapper'
import { Tutorial } from './(component)/tutorial'
import s from './storyblok.module.scss'

export default async function Storyblok() {
  const { data } = await storyblokApi.get('cdn/stories/home', {
    version: process.env.NODE_ENV === 'development' ? 'draft' : 'published',
  })

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
