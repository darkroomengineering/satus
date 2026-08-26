import type { MetadataRoute } from 'next'

import { SITE } from '@/lib/seo/site'

export interface StaticRoute {
  path: string
  label: string
  description: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

/**
 * Starter-owned pages that always exist, independent of an optional CMS.
 * The sitemap, machine view, llms.txt, and Markdown representations all read
 * this catalog so clients only add a route description once.
 */
export const STATIC_ROUTES: readonly StaticRoute[] = [
  {
    path: '/',
    label: 'Home',
    description: SITE.description,
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    path: '/ai',
    label: 'Agent index',
    description:
      'Server-rendered site facts, page links, agent guidance, and developer resources.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
]
