// https://github.com/storyblok/storyblok-js-client

import StoryblokClient from 'storyblok-js-client'

class StoryblokApi extends StoryblokClient {
  constructor({ draft = false, ...props } = {}) {
    super({
      accessToken: draft
        ? process.env.STORYBLOK_PREVIEW_ACCESS_TOKEN
        : process.env.STORYBLOK_PUBLIC_ACCESS_TOKEN,
      region: 'us',
      ...props,
    })

    this.draft = draft
    this.version = draft ? 'draft' : 'published'
  }

  async get(path, params = {}, options = {}) {
    params.version = this.version

    if (this.draft || process.env.NODE_ENV === 'development') {
      options.cache = 'no-store'
    }
    return await super.get(path, params, options)
  }
}

export { StoryblokApi }
