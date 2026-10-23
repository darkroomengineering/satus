import { defineConfig } from 'sanity'
import { linkField } from 'sanity-plugin-link-field'
import {
  defineDocuments,
  defineLocations,
  presentationTool,
} from 'sanity/presentation'
import { structureTool } from 'sanity/structure'

import { dataset, previewURL, projectId } from './env'
import { schema } from './schemas'

// One document each, at a fixed id. Sanity hides them from "create new" and
// drops Duplicate; `document.actions` below also drops Delete and Unpublish,
// since the site reads them by id and has no fallback when they vanish.
const SINGLETONS = ['navigation']
const SINGLETON_BLOCKED_ACTIONS = new Set(['delete', 'unpublish'])

// Keep in sync with `resolveDocumentUrl` in `./utils/link.ts`, which this
// dual-compiled file can't import.
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    // `home` previews at `/home`: `/` is the developer-owned starter page.
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
 * `null` when there is no projectId: `defineConfig` throws on an empty one,
 * which would break CI/preview builds without Sanity secrets. The studio page
 * renders a 404 instead of mounting `NextStudio`.
 *
 * Gated on the `./env` values, not `isConfigured('sanity')`. This module is
 * dual-compiled into the client bundle (the Studio route imports it across a
 * `'use client'` boundary), where `isConfigured` sees the browser `process`
 * polyfill's empty `{}` (only literal `process.env.NEXT_PUBLIC_X` reads are
 * inlined), so it was always false and 404'd a correctly configured Studio
 * after hydration.
 */
export default projectId && dataset
  ? defineConfig({
      basePath: '/studio',
      projectId,
      dataset,
      schema,
      document: {
        singletons: SINGLETONS,
        actions: (actions, { singleton }) =>
          singleton
            ? actions.filter(
                ({ action }) =>
                  !action || !SINGLETON_BLOCKED_ACTIONS.has(action)
              )
            : actions,
      },
      plugins: [
        // First, so the Studio opens on the content list.
        structureTool({
          structure: (S) =>
            S.list()
              .title('Content')
              .items([
                S.documentTypeListItem('page').title('Pages'),
                S.documentTypeListItem('article').title('Articles'),
                S.divider(),
                ...SINGLETONS.map((id) => S.listItem().singleton(id)),
              ]),
        }),
        presentationTool({
          resolve: {
            mainDocuments: defineDocuments([
              // First: the static `/sanity` route must resolve ahead of the
              // generic page-by-slug entry.
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
        // Registers the `link` type every link field uses (`linkField` in
        // `./schemas/fields.ts`). Each linkable type needs a case in
        // `resolveDocumentUrl` (`./utils/link.ts`), and each enabled built-in
        // type a branch in `urlForReference`; anything else resolves to `#`.
        linkField({
          linkableSchemaTypes: ['page', 'article'],
          enabledBuiltInLinkTypes: ['internal', 'external', 'email', 'phone'],
        }),
      ],
    })
  : null
