import { defineField, type Rule, type SchemaValidationValue } from 'sanity'
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

type LinkFieldOptions = {
  enableText: boolean
}

type ExtendLinkField = {
  name?: string
  title?: string
  options?: LinkFieldOptions
  validation?: (rule: Rule) => SchemaValidationValue
}

export function extendedLinkField({
  name = 'link',
  title = 'Link',
  options = { enableText: true },
}: ExtendLinkField) {
  return defineField({
    name,
    title,
    type: 'link',
    options,
  })
}
