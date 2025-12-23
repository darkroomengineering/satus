import { defineField, defineType } from 'sanity'

// Native Sanity link object type
export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'linkType',
      title: 'Link Type',
      type: 'string',
      options: {
        list: [
          { title: 'Internal', value: 'internal' },
          { title: 'External', value: 'external' },
        ],
        layout: 'radio',
      },
      initialValue: 'internal',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'internalLink',
      title: 'Internal Link',
      type: 'reference',
      to: [{ type: 'page' }, { type: 'article' }],
      hidden: ({ parent }) => parent?.linkType !== 'internal',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string }
          if (parent?.linkType === 'internal' && !value) {
            return 'Internal link is required'
          }
          return true
        }),
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      hidden: ({ parent }) => parent?.linkType !== 'external',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string }
          if (parent?.linkType === 'external' && !value) {
            return 'External URL is required'
          }
          return true
        }).uri({
          scheme: ['http', 'https', 'mailto', 'tel'],
        }),
    }),
    defineField({
      name: 'text',
      title: 'Link Text',
      type: 'string',
      description: 'Optional custom text for the link',
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in New Tab',
      type: 'boolean',
      initialValue: false,
      hidden: ({ parent }) => parent?.linkType !== 'external',
    }),
  ],
  preview: {
    select: {
      linkType: 'linkType',
      text: 'text',
      internalTitle: 'internalLink.title',
      externalUrl: 'externalUrl',
    },
    prepare({ linkType, text, internalTitle, externalUrl }) {
      const title = text || internalTitle || externalUrl || 'Untitled Link'
      const subtitle =
        linkType === 'internal'
          ? `Internal: ${internalTitle || 'No page selected'}`
          : `External: ${externalUrl || 'No URL'}`

      return {
        title,
        subtitle,
      }
    },
  },
})

// Helper field exports for easy reuse
export const linkField = defineField({
  name: 'link',
  title: 'Link',
  type: 'link',
})

export const linkFieldWithLabel = defineField({
  name: 'link',
  title: 'Link',
  type: 'link',
})

export const linkFieldWithLabelAndRequired = defineField({
  name: 'link',
  title: 'Link',
  type: 'link',
  validation: (Rule) => Rule.required(),
})

type LinkFieldOptions = {
  name?: string
  title?: string
  required?: boolean
}

export function extendedLinkField({
  name = 'link',
  title = 'Link',
  required = false,
}: LinkFieldOptions = {}) {
  return defineField({
    name,
    title,
    type: 'link',
    validation: required ? (Rule) => Rule.required() : undefined,
  })
}
