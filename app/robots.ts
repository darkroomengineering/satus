import type { MetadataRoute } from 'next'

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/studio/', '/api/draft-mode/'],
    },
    sitemap: `${APP_BASE_URL}/sitemap.xml`,
  }
}
