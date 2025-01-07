// https://github.com/storyblok/storyblok-js-client
'server only'

import { draftMode } from 'next/headers'
import StoryblokClient, {
  type ISbCustomFetch,
  type ISbStoriesParams,
} from 'storyblok-js-client'

interface StoryblokConfig {
  draft?: boolean
  cache?: {
    clear: 'auto' | 'manual'
    type: 'memory'
  }
}

class StoryblokApi extends StoryblokClient {
  private draft: boolean
  private version: ISbStoriesParams['version']

  constructor({ draft = false, ...props }: StoryblokConfig = {}) {
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

  async get(
    path: string,
    params: ISbStoriesParams = {},
    options: ISbCustomFetch = {}
  ) {
    params.version = this.version

    if (this.draft) {
      options.cache = 'no-store'
    }
    return await super.get(path, params, options)
  }

  async cacheFlush() {
    await super.flushCache()
    console.log('Storyblok Cache flushed')
  }
}

export { StoryblokApi }

export async function fetchStoryblokStory(
  slug: string,
  options: ISbStoriesParams
) {
  const _draftMode = await draftMode()
  const isDraftMode =
    _draftMode.isEnabled || process.env.NODE_ENV === 'development'

  try {
    const storyblokStory = await new StoryblokApi({
      draft: isDraftMode,
      cache: {
        clear: 'auto',
        type: 'memory',
      },
    }).get(slug, options)

    return storyblokStory
  } catch (error) {
    console.error('fetchStoryblokStory error', error)
    return { data: null, error }
  }
}

export async function fetchAll(slug = 'cdn/stories', options = {}) {
  try {
    const storyblokClient = new StoryblokApi({
      draft: false,
      cache: {
        clear: 'auto',
        type: 'memory',
      },
    })

    const response = await storyblokClient.getAll(slug, options)

    if (!response) {
      return { data: [], error: 'No data found' }
    }

    return { data: response }
  } catch (error) {
    console.error('fetchAll error', error)
    return { data: [], error }
  }
}

interface DatasourceEntry {
  id: number
  name: string
  value: string
  dimension_value?: string
}

export async function fetchDataSources(slug: string) {
  const storyblokClient = new StoryblokApi({
    draft: false,
  })

  let page = 1
  let allEntries: DatasourceEntry[] = []
  let hasMoreEntries = true

  // Fetch all pages
  while (hasMoreEntries) {
    const { data } = await storyblokClient.get(
      'cdn/datasource_entries/',
      {
        datasource: slug,
        cv: new Date().getTime(),
        page,
        per_page: 100, // Maximum allowed per page
      },
      {
        cache: 'no-cache',
      }
    )

    if (data?.datasource_entries?.length) {
      allEntries = [...allEntries, ...data.datasource_entries]
      page++
    } else {
      hasMoreEntries = false
    }
  }

  return allEntries
}
