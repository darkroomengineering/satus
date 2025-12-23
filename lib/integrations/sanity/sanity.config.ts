/**
 * This configuration is used to for the Sanity Studio that's mounted on the `/app/studio/[[...tool]]/page.tsx` route
 */

import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import {
  defineDocuments,
  defineLocations,
  presentationTool,
} from 'sanity/presentation'
import { structureTool } from 'sanity/structure'
import { apiVersion, dataset, previewURL, projectId } from './env'
import { schema } from './schemaTypes'
import { structure } from './structure'

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

export default defineConfig({
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
            filter: `_type == "article" && slug.current == $slug && defined(slug.current)`,
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
                  title: doc?.title || 'Untitled Page',
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
                  title: doc?.title || 'Untitled Article',
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
    structureTool({ structure }),
    // Vision is for querying with GROQ from inside the Studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({ defaultApiVersion: apiVersion }),
  ],
})
