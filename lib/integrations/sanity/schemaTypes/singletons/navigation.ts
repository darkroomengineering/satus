import { defineField, defineType } from 'sanity'

export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
      description: 'Title of the navigation',
    }),
    defineField({
      type: 'array',
      name: 'socials',
      title: 'Socials',
      of: [
        {
          name: 'socialLink',
          type: 'object',
          title: 'Social Link',
          fields: [
            defineField({
              name: 'logo',
              type: 'image',
              title: 'Logo',
            }),
            defineField({
              name: 'socialMedia',
              title: 'Social Media',
              type: 'link',
            }),
          ],
        },
      ],
    }),
  ],
})
