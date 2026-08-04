import type { MetadataRoute } from 'next'

import { APP_BASE_URL } from '@/lib/env'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // The machine view (`app/(site)/ai/page.tsx`) has no link from the design, so
    // crawlers only discover it here. New routes must be added both here
    // and to `PAGES` in `app/(site)/ai/page.tsx`.
    {
      url: `${APP_BASE_URL}/ai`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  return baseRoutes
}
