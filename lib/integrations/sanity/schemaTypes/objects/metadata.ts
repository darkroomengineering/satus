import { defineField, defineType } from 'sanity'

export const metadata = defineType({
  name: 'metadata',
  title: 'SEO & Metadata',
  type: 'object',
  options: {
    collapsible: true,
    collapsed: true,
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Meta Title',
      type: 'string',
      description: 'Title for search engines and social media',
      validation: (Rule) =>
        Rule.max(60).warning(
          'Title should be under 60 characters for optimal SEO'
        ),
    }),
    defineField({
      name: 'description',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Description for search engines and social media',
      validation: (Rule) =>
        Rule.max(160).warning(
          'Description should be under 160 characters for optimal SEO'
        ),
    }),
    defineField({
      name: 'keywords',
      title: 'Keywords',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Keywords for search engines',
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'image',
      title: 'Social Media Image',
      type: 'image',
      description: 'Image for social media sharing (1200x630px recommended)',
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
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      description: 'Prevent search engines from indexing this page',
      initialValue: false,
    }),
  ],
})
