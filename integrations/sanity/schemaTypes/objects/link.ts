import { defineField } from 'sanity'
import { requiredLinkField } from 'sanity-plugin-link-field'

export const linkField = defineField({
  name: 'link',
  title: 'Link',
  type: 'link',
})

export const linkFieldWithLabel = defineField({
  name: 'link',
  title: 'Link',
  type: 'link',
  options: {
    enableText: true,
  },
})

export const linkFieldWithLabelAndRequired = defineField({
  name: 'link',
  title: 'Link',
  type: 'link',
  options: {
    enableText: true,
  },
  validation: (rule) => rule.custom((field) => requiredLinkField(field)),
})
