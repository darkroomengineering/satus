import type { MetadataRoute } from 'next'

import { BASE_URL } from '@/lib/seo/site'

const DISALLOW = ['/api/draft-mode/']

/**
 * One `*` group covers every crawler, AI answer engines included: a bot with
 * no group of its own follows `*` (RFC 9309). Add a named group only to treat
 * a bot differently, e.g. to opt out of OpenAI training while staying in
 * ChatGPT search: `{ userAgent: 'GPTBot', disallow: '/' }`. Blocking
 * `Google-Extended` also keeps content out of Gemini Apps and Vertex AI
 * grounding; `Googlebot` still controls search indexing.
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
