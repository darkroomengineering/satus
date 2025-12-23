import { defineField, defineType } from 'sanity'

const articleFields = [
  defineField({
    name: 'title',
    title: 'Title',
    type: 'string',
    description: 'The title of the article',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'excerpt',
    title: 'Excerpt',
    type: 'text',
    rows: 3,
    description: 'A brief summary of the article',
    validation: (Rule) => Rule.max(200),
  }),
  defineField({
    name: 'featuredImage',
    title: 'Featured Image',
    type: 'image',
    description: 'Main image for the article',
    options: {
      hotspot: true,
    },
    fields: [
      {
        name: 'alt',
        title: 'Alt Text',
        type: 'string',
        description: 'Alternative text for screen readers',
      },
    ],
  }),
  defineField({
    name: 'content',
    title: 'Content',
    type: 'richText',
    description: 'The main content of the article',
  }),
  defineField({
    name: 'categories',
    title: 'Categories',
    type: 'array',
    of: [{ type: 'string' }],
    description: 'Categories for this article',
    options: {
      layout: 'tags',
    },
  }),
  defineField({
    name: 'tags',
    title: 'Tags',
    type: 'array',
    of: [{ type: 'string' }],
    description: 'Tags for this article',
    options: {
      layout: 'tags',
    },
  }),
]

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'The URL path for this article',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      description: 'The author of this article',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      description: 'When this article was published',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'metadata',
      title: 'SEO & Metadata',
      type: 'metadata',
      description: 'SEO settings for this article',
    }),
    ...articleFields,
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
      media: 'featuredImage',
    },
    prepare({ title, slug, media }) {
      return {
        title: title || 'Untitled',
        subtitle: slug ? `/blog/${slug}` : 'No slug',
        media,
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
    {
      title: 'Title A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
