/**
 * This configuration is used to for the Sanity Studio that's mounted on the `/app/studio/[[...tool]]/page.tsx` route
 */

import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
import { apiVersion, dataset, projectId } from './env'
import { schema } from './schemaTypes'
import { structure } from './structure'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  // Add and edit the content schema in the './schemaTypes' folder
  schema,
  plugins: [
    structureTool({ structure }),
    // Vision is for querying with GROQ from inside the Studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({ defaultApiVersion: apiVersion }),
    // Presentation tool for visual editing
    presentationTool({
      resolve: {
        mainDocuments: [
          // Home page - specific route for home page
          {
            route: '/sanity',
            filter: `_type == "page" && slug.current == "home"`,
          },
          // Pages by slug - only pages with valid slugs
          {
            route: '/sanity/:slug',
            filter: `_type == "page" && slug.current == $slug && defined(slug.current)`,
          },
          // Articles by slug - only articles with valid slugs
          {
            route: '/sanity/:slug',
            filter: `_type == "article" && slug.current == $slug && defined(slug.current)`,
          },
        ],
        locations: {
          page: {
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => {
              if (!doc?.slug) return null
              return {
                locations: [
                  {
                    title: doc?.title || 'Untitled Page',
                    href:
                      doc?.slug === 'home' ? '/sanity' : `/sanity/${doc.slug}`,
                  },
                ],
              }
            },
          },
          article: {
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => {
              if (!doc?.slug) return null
              return {
                locations: [
                  {
                    title: doc?.title || 'Untitled Article',
                    href: `/sanity/${doc.slug}`,
                  },
                ],
              }
            },
          },
        },
      },
      previewUrl: {
        draftMode: {
          enable: '/api/draft',
          disable: '/api/disable-draft',
        },
      },
    }),
  ],
})
