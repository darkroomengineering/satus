import type { MetadataRoute } from 'next'

import { BASE_URL } from '@/lib/seo/site'

const DISALLOW = ['/api/draft-mode/']

/**
 * AI answer-engine crawlers, allowed explicitly rather than relying on the
 * `*` rule below.
 *
 * Two reasons: several of these only honor a directive addressed to them by
 * name (a bare `*` rule is not a reliable substitute), and being explicit
 * makes the decision reviewable — a project that wants to opt OUT of AI
 * training flips these to `disallow: '/'` in one place instead of hunting
 * for an implicit allow.
 *
 * `Google-Extended` controls Gemini / AI Overviews training data specifically
 * — it is separate from `Googlebot`, which continues to control regular
 * search indexing and is unaffected by this list.
 */
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
