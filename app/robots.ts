import type { MetadataRoute } from 'next'

import { BASE_URL } from '@/lib/seo/site'

const DISALLOW = ['/api/draft-mode/']

/**
 * One `*` group covers every crawler, AI answer engines included: a bot with
 * no group of its own follows `*` (RFC 9309). Add a named group only to treat
 * a bot differently, e.g. to opt out of AI training while staying in AI
 * search: `{ userAgent: ['GPTBot', 'Google-Extended'], disallow: '/' }`.
 * `Google-Extended` covers Gemini training only; `Googlebot` still controls
 * search indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: DISALLOW,
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
