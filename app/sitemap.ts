import type { MetadataRoute } from 'next'

import { getCmsRoutes, STATIC_ROUTES } from '@/lib/seo/routes'
import { BASE_URL } from '@/lib/seo/site'

/**
 * Static routes come from `STATIC_ROUTES` in `lib/seo/routes.ts`, shared with
 * `/llms.txt` and `/ai` so they can't drift. The design doesn't link `/ai`, so
 * crawlers only discover it here.
 *
 * CMS routes (`getCmsRoutes`) are appended when Sanity is configured.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cmsRoutes = await getCmsRoutes()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const cmsEntries: MetadataRoute.Sitemap = cmsRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: route.lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticEntries, ...cmsEntries]
}
