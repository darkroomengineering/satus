import { defineField, defineType } from 'sanity'

/**
 * Example schema demonstrating common patterns and best practices
 * This can be used as a reference for creating new content types
 */
export const example = defineType({
  name: 'example',
  title: 'Example Page',
  type: 'document',
  fields: [
    // Basic required fields
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The main title of the page',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'URL path for this page',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),

    // Hero section object
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        {
          name: 'headline',
          title: 'Headline',
          type: 'string',
          validation: (Rule) => Rule.max(100),
        },
        {
          name: 'subheadline',
          title: 'Subheadline',
          type: 'text',
          rows: 3,
        },
        {
          name: 'image',
          title: 'Hero Image',
          type: 'image',
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
        },
        {
          name: 'showCTA',
          title: 'Show Call to Action',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'ctaText',
          title: 'CTA Text',
          type: 'string',
          hidden: ({ parent }) => !parent?.showCTA,
        },
        {
          name: 'ctaLink',
          title: 'CTA Link',
          type: 'url',
          hidden: ({ parent }) => !parent?.showCTA,
        },
      ],
    }),

    // Rich text content
    defineField({
      name: 'content',
      title: 'Content',
      type: 'richText',
      description: 'The main content of the page',
    }),

    // Features array
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'title',
              title: 'Feature Title',
              type: 'string',
            },
            {
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
            },
            {
              name: 'icon',
              title: 'Icon',
              type: 'image',
              options: {
                hotspot: true,
              },
            },
          ],
        },
      ],
    }),

    // Tags array
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),

    // SEO metadata
    defineField({
      name: 'metadata',
      title: 'SEO & Metadata',
      type: 'metadata',
      description: 'SEO settings for this page',
    }),

    // Publishing info
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      description: 'When this page was published',
      initialValue: () => new Date().toISOString(),
    }),

    // Conditional field example
    defineField({
      name: 'showInNavigation',
      title: 'Show in Navigation',
      type: 'boolean',
      initialValue: false,
    }),

    // Custom validation example
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
      validation: (Rule) =>
        Rule.email().error('Please enter a valid email address'),
    }),
  ],

  // Custom preview
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
      media: 'hero.image',
    },
    prepare({ title, slug, media }) {
      return {
        title: title || 'Untitled Example',
        subtitle: slug ? `/${slug}` : 'No slug',
        media,
      }
    },
  },

  // Ordering options
  orderings: [
    {
      title: 'Published Date, New',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      title: 'Title A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
