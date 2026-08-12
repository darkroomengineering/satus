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

import { apiVersion, dataset, previewURL, projectId } from './env'
import { schema } from './schemas'

// Helper function for URL resolution — kept in sync with
// `resolveDocumentUrl` in `./utils/link.ts` (this file can't import that
// module: it's dual-compiled into the client bundle for the Studio route).
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    // `home` is not special-cased: `/` is the developer-owned starter page,
    // so a `home` document previews at `/home` like any other slug.
    case 'page':
      return slug ? `/${slug}` : undefined
    case 'article':
      return slug ? `/articles/${slug}` : undefined
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
 *
 * Gated on the values from `./env`, NOT on `isConfigured('sanity')`. This
 * module is dual-compiled into the client bundle (the Studio route imports
 * it across a `'use client'` boundary), and `isConfigured` validates the
 * whole `process.env` object — which the browser `process` polyfill defines
 * as a permanently empty `{}`. Only literal `process.env.NEXT_PUBLIC_X`
 * reads get inlined at build time, so the schema check was always false in
 * the browser and 404'd a correctly configured Studio after hydration.
 */
export default projectId && dataset
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
              // Static segments win over the catch-all — keep this first so
              // the tutorial page (a real static route) resolves ahead of
              // the generic page-by-slug entry below.
              {
                route: '/sanity',
                filter: `_type == "page" && slug.current == "sanity"`,
              },
              {
                route: '/articles/:slug',
                filter: `_type == "article" && slug.current == $slug`,
              },
              {
                route: '/:slug',
                filter: `_type == "page" && slug.current == $slug`,
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
