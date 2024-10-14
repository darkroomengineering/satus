// this file is used to generate the sitemap websites using storyblok

import { StoryblokApi } from 'libs/storyblok'

const storyblokApi = new StoryblokApi()

// replace with your website url
const URL = 'https://example.com'

// add your predefined static routes
const predefinedStaticRoutes = ['', '/blog', '/about', '/careers']

async function fetchAllStories() {
  let page = 1
  let hasMoreStories = true
  let allStories = []

  while (hasMoreStories) {
    try {
      const { data } = await storyblokApi.get('cdn/stories', {
        version: 'published',
        per_page: 100,
        page: page,
        excluding_fields: 'body',
      })

      allStories = [...allStories, ...data.stories]

      if (data.stories.length < 100) {
        hasMoreStories = false
      } else {
        page++
      }
    } catch (error) {
      console.error('Error fetching stories:', error)
      hasMoreStories = false
    }
  }

  return allStories
}

export default async function sitemap() {
  const stories = await fetchAllStories()

  const routes = stories.map((story) => ({
    url: `${URL}/${story.full_slug}`,
    lastModified: new Date(story.published_at).toISOString(),
  }))

  const staticRoutes = predefinedStaticRoutes.map((route) => ({
    url: `${URL}${route}`,
    lastModified: new Date().toISOString(),
  }))

  return [...staticRoutes, ...routes]
}
