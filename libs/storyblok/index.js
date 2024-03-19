// https://github.com/storyblok/storyblok-js-client

import StoryblokClient from 'storyblok-js-client'

const storyblokApi = new StoryblokClient({
  accessToken:
    process.env.NODE_ENV === 'development'
      ? process.env.STORYBLOK_PREVIEW_ACCESS_TOKEN
      : process.env.STORYBLOK_PUBLIC_ACCESS_TOKEN,
  region: 'us',
})

export { storyblokApi }
