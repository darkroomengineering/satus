/**
 * Configuration for the standalone Sanity Studio — run it with
 * `bunx sanity dev` from this directory, or `bunx sanity deploy`
 * to host it at https://<project>.sanity.studio.
 */

import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import {
  defineDocuments,
  defineLocations,
  presentationTool,
} from 'sanity/presentation'
import { structureTool } from 'sanity/structure'
import { isConfigured } from '@/integrations/registry'
import { apiVersion, dataset, previewURL, projectId } from './env'
import { schema } from './schemas'

// Helper function for URL resolution
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    case 'page':
      return slug === 'sanity' ? '/sanity' : `/sanity/${slug}`
    case 'article':
      return slug ? `/sanity/${slug}` : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}

/**
 * `null` when Sanity isn't configured (no projectId) — `defineConfig` throws
 * on an empty projectId, so this must not be called during CI/preview
 * builds that have no Sanity secrets set. The studio page checks this and
 * renders a 404 instead of mounting `NextStudio`.
 */
export default isConfigured('sanity')
  ? defineConfig({
      basePath: '/studio',
      projectId,
      dataset,
      schema,
      plugins: [
        // Presentation tool for visual editing
        presentationTool({
          resolve: {
            // Map routes to documents and GROQ filters
            mainDocuments: defineDocuments([
              {
                route: '/sanity',
                filter: `_type == "page" && slug.current == "sanity"`,
              },
              {
                route: '/sanity/:slug',
                filter: `_type == "article" && slug.current == $slug`,
              },
            ]),
            locations: {
              page: defineLocations({
                select: {
                  title: 'title',
                  slug: 'slug.current',
                },
                resolve: (doc) => ({
                  locations: [
                    {
                      title: doc?.title ?? 'Untitled Page',
                      href: resolveHref('page', doc?.slug)!,
                    },
                  ],
                }),
              }),
              article: defineLocations({
                select: {
                  title: 'title',
                  slug: 'slug.current',
                },
                resolve: (doc) => ({
                  locations: [
                    {
                      title: doc?.title ?? 'Untitled Article',
                      href: resolveHref('article', doc?.slug)!,
                    },
                  ],
                }),
              }),
            },
          },
          previewUrl: {
            origin: previewURL,
            draftMode: {
              enable: '/api/draft-mode/enable',
              disable: '/api/draft-mode/disable',
            },
          },
        }),
        structureTool(),
        // Vision is for querying with GROQ from inside the Studio
        // https://www.sanity.io/docs/the-vision-plugin
        visionTool({ defaultApiVersion: apiVersion }),
      ],
    })
  : null
