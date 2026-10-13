import { at, defineMigration, unset } from 'sanity/migrate'
import { z } from 'zod'

/**
 * Second half of `../link-plugin-fields`: unsets the old hand-rolled link
 * fields (`linkType`, `externalUrl`, `openInNewTab`) once the site reads the
 * plugin's. Run it after the code that reads `type`/`url`/`blank` is live,
 * since the old code reads nothing else.
 *
 * It skips a link with no `type`, which `link-plugin-fields` has not reached
 * (a link it could not map, or one added after it ran): unsetting there would
 * delete the only copy of where the link points.
 */

const savedLink = z.object({
  _type: z.literal('link'),
  type: z.string().optional(),
  linkType: z.unknown().optional(),
  externalUrl: z.unknown().optional(),
  openInNewTab: z.unknown().optional(),
})

const OLD_FIELDS = ['linkType', 'externalUrl', 'openInNewTab'] as const

export default defineMigration({
  title: 'Unset the old link fields after link-plugin-fields',
  migrate: {
    object(node) {
      const parsed = savedLink.safeParse(node)
      if (!parsed.success || parsed.data.type === undefined) return undefined

      const link = parsed.data
      return OLD_FIELDS.filter((field) => link[field] !== undefined).map(
        (field) => at(field, unset())
      )
    },
  },
})
