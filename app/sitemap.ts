import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

const APP_BASE_URL = env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  return baseRoutes
}
