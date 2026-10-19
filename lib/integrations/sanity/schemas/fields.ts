import { defineField } from 'sanity'
import { requiredLinkField } from 'sanity-plugin-link-field'

/**
 * Alt text for an image field: put it in the image's own `fields`.
 * Optional, because an empty alt marks the image as decorative and
 * `SanityImage` renders it as `alt=""`. Cost: nothing reminds an editor who
 * skips it on an image that carries meaning. Rich text overrides it to
 * required (see `richText.ts`).
 */
export const altField = defineField({
  name: 'alt',
  title: 'Alt Text',
  type: 'string',
  description:
    'Describes the image for screen readers. Leave empty if the image is only decoration.',
})

/**
 * A link field, typed as the `link` type that `sanity-plugin-link-field`
 * registers in `../sanity.config.ts`. Resolve it with `getLinkAttributes` in
 * `../utils/link.ts`, and dereference `internalLink->{_type, slug}` in every
 * query that returns it.
 *
 * `required` goes through the plugin's `requiredLinkField`: a link is an
 * object, so `Rule.required()` accepts one with nothing filled in. An optional
 * link sets no `validation` at all, because a field-level `validation`
 * replaces the plugin's own checks on the link (its URL scheme rule among
 * them).
 */
export const linkField = (
  name: string,
  {
    title,
    description,
    required = false,
    enableText = false,
  }: {
    title?: string
    description?: string
    required?: boolean
    enableText?: boolean
  } = {}
) => {
  const field = {
    name,
    type: 'link',
    ...(title && { title }),
    ...(description && { description }),
    ...(enableText && { options: { enableText } }),
  } as const

  return required
    ? defineField({
        ...field,
        validation: (rule) => rule.custom(requiredLinkField),
      })
    : defineField(field)
}
