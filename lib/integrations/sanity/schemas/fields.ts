import { defineField } from 'sanity'

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
