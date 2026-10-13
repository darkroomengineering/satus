import { at, defineMigration, set } from 'sanity/migrate'
import { z } from 'zod'

/**
 * Moves links saved by the old hand-rolled `link` type to the fields
 * sanity-plugin-link-field reads. The old type saved `linkType`,
 * `externalUrl` and `openInNewTab`; the plugin reads `type`, `url` (or
 * `email`/`phone`) and `blank`. Until this runs, those links resolve to `#`.
 * `internalLink` and `text` keep their names and are left alone.
 *
 * It only adds the new fields. The old ones stay, so a deployment still
 * running the old code keeps rendering the same links until the new code
 * ships; `../link-plugin-cleanup` unsets them afterwards. The cost: an edit
 * made in the old Studio after this runs changes only the old fields, which
 * the new code ignores and the cleanup deletes, and a second run does not
 * pick it up because the new fields are already set.
 *
 * An external `mailto:` or `tel:` URL becomes an email or phone link, since
 * the plugin's `url` field only accepts http(s) and relative URLs. A field the
 * plugin already set is never overwritten, so running it twice is a no-op.
 *
 * Runs as a dry run unless passed `--no-dry-run`. The commands, with env
 * loading, are under "Migrating links saved before the plugin" in
 * `lib/integrations/sanity/README.md`.
 */

// Only the fields this migration reads. A `link` object that fails to parse
// (a field with a type neither shape ever saved) is left as it is.
const savedLink = z.object({
  _type: z.literal('link'),
  linkType: z.string().optional(),
  externalUrl: z.string().optional(),
  openInNewTab: z.boolean().optional(),
  type: z.string().optional(),
  url: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  blank: z.boolean().optional(),
})

type SavedLink = z.infer<typeof savedLink>

/** Where an old link's type and URL go in the plugin's shape. */
function pluginTarget(link: SavedLink) {
  const url = link.externalUrl?.trim() ?? ''
  const scheme = url.slice(0, url.indexOf(':') + 1).toLowerCase()

  if (link.linkType === 'external' && scheme === 'mailto:') {
    return { type: 'email', field: 'email', value: url.slice(scheme.length) }
  }
  if (link.linkType === 'external' && scheme === 'tel:') {
    return { type: 'phone', field: 'phone', value: url.slice(scheme.length) }
  }
  return { type: link.linkType, field: 'url', value: url }
}

export default defineMigration({
  title: 'Copy saved links into sanity-plugin-link-field fields',
  migrate: {
    object(node) {
      const parsed = savedLink.safeParse(node)
      if (!parsed.success) return undefined

      const link = parsed.data
      const { linkType, externalUrl, openInNewTab } = link
      if (
        linkType === undefined &&
        externalUrl === undefined &&
        openInNewTab === undefined
      ) {
        return undefined
      }

      const target = pluginTarget(link)
      const existing = {
        url: link.url,
        email: link.email,
        phone: link.phone,
      }[target.field]

      return [
        ...(target.type !== undefined && link.type === undefined
          ? [at('type', set(target.type))]
          : []),
        ...(target.value && existing === undefined
          ? [at(target.field, set(target.value))]
          : []),
        // The plugin has no new-tab toggle on email and phone links.
        ...(openInNewTab !== undefined &&
        target.field === 'url' &&
        link.blank === undefined
          ? [at('blank', set(openInNewTab))]
          : []),
      ]
    },
  },
})
