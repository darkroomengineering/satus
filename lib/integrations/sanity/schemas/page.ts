import { defineField, defineType } from 'sanity'

import { linkFieldWithLabelAndRequired } from './link'

const pageFields = [
  defineField({
    name: 'title',
    title: 'Title',
    type: 'string',
    description: 'The title of the page',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'content',
    title: 'Content',
    type: 'richText',
    description: 'The main content of the page',
  }),
  linkFieldWithLabelAndRequired,
]

export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'The URL path for this page',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) =>
        Rule.required().custom((slug) => {
          // A dot is a valid Sanity slug character but collides with
          // proxy.ts's FILE_EXTENSION heuristic (`/\/[^/]+\.[^/]+$/`), which
          // treats any dotted last path segment as a static asset and skips
          // it from routing/discovery entirely — see
          // `routableDocumentSchema` in `lib/seo/routes.ts`, which already
          // rejects dotted slugs read back from the CMS. Blocking it here
          // stops an editor from publishing a route that would silently
          // vanish from the sitemap, `/llms.txt`, and the Markdown handler.
          if (slug?.current?.includes('.')) {
            return 'Slug cannot contain a dot ("."). Dotted paths are treated as static files and are excluded from the sitemap, llms.txt, and Markdown negotiation.'
          }
          return true
        }),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      description: 'When this page was published',
      initialValue: () => new Date().toISOString(),
    }),

    defineField({
      name: 'metadata',
      title: 'SEO & Metadata',
      type: 'metadata',
      description: 'SEO settings for this page',
    }),
    ...pageFields,
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
    },
    prepare({ title, slug }) {
      return {
        title: title || 'Untitled',
        subtitle: slug ? `/${slug}` : 'No slug',
      }
    },
  },
  orderings: [
    {
      title: 'Published Date, New',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      title: 'Published Date, Old',
      name: 'publishedAtAsc',
      by: [{ field: 'publishedAt', direction: 'asc' }],
    },
  ],
})
