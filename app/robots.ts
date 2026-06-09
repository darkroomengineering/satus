import type { MetadataRoute } from 'next'
import { APP_BASE_URL } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/draft-mode/'],
    },
    sitemap: `${APP_BASE_URL}/sitemap.xml`,
  }
}
