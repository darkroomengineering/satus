/**
 * Structural link shape shared by the raw schema `Link` object and the
 * dereferenced link projection emitted by TypeGen (`internalLink->{...}`).
 * Kept permissive so both satisfy it without coupling this util to either type.
 */
type LinkLike = {
  linkType?: string | null
  externalUrl?: string | null
  openInNewTab?: boolean | null
  internalLink?: {
    _type?: string | null
    slug?: { current?: string | null } | null
  } | null
} | null

/**
 * Schemes allowed on a rendered external `href`. Mirrors the authoring-time
 * allowlist on the `externalUrl` field (`schemas/link.ts`,
 * `.uri({ scheme: ['http','https','mailto','tel'] })`). That schema check is
 * advisory — never enforced by the Sanity content API — so a write token, a
 * content import, or a direct API write can still plant a `javascript:` (or
 * other dangerous-scheme) URL that reaches this anchor's `href`. Re-check at
 * render time so a bad scheme becomes an inert `#` instead of executing.
 */
const SAFE_EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const MAX_INTERNAL_SLUG_LENGTH = 96

function hasUnsafeInternalSlugCharacter(value: string): boolean {
  return (
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('?') ||
    value.includes('#') ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0)
      return (
        codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)
      )
    })
  )
}

function isSafeInternalSlug(slug: string): boolean {
  if (
    slug.length === 0 ||
    slug.length > MAX_INTERNAL_SLUG_LENGTH ||
    slug === '.' ||
    slug === '..' ||
    hasUnsafeInternalSlugCharacter(slug)
  ) {
    return false
  }

  try {
    const decoded = decodeURIComponent(slug)
    return (
      decoded !== '.' &&
      decoded !== '..' &&
      !hasUnsafeInternalSlugCharacter(decoded)
    )
  } catch {
    return false
  }
}

function isSafeExternalUrl(url: string): boolean {
  const trimmed = url.trim()
  if (trimmed.startsWith('//') || trimmed.includes('\\')) return false

  // Relative targets (path, query, hash) are same-origin and always safe.
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('?')
  ) {
    return true
  }

  try {
    // A scheme-bearing URL keeps its own protocol; `javascript:`/`data:`/
    // `vbscript:` therefore fail the allowlist. The base only resolves
    // genuinely relative inputs, which the guard above already accepted.
    return SAFE_EXTERNAL_SCHEMES.has(
      new URL(trimmed, 'http://localhost').protocol
    )
  } catch {
    return false
  }
}

export const urlForReference = (link: LinkLike): string => {
  if (!link) return '#'

  // External URL — reject any scheme outside the allowlist (see
  // isSafeExternalUrl) so CMS content can't inject a `javascript:` href.
  if (link.linkType === 'external' && link.externalUrl) {
    return isSafeExternalUrl(link.externalUrl) ? link.externalUrl : '#'
  }

  // Internal reference (dereferenced document with slug)
  if (link.linkType === 'internal' && link.internalLink) {
    return resolveDocumentUrl(
      link.internalLink._type ?? undefined,
      link.internalLink.slug?.current ?? undefined
    )
  }

  return '#'
}

function resolveDocumentUrl(documentType?: string, slug?: string): string {
  if (!slug || !isSafeInternalSlug(slug)) return '#'

  switch (documentType) {
    // Every page slug maps to its own path — including `home` → `/home`.
    // `/` is the developer-owned starter page (`app/(site)/page.tsx`) and the
    // catch-all can't match an empty segment, so claiming `/` for a `home`
    // document would link to a route that never serves it.
    case 'page':
      return `/${slug}`
    case 'article':
      return `/articles/${slug}`
    default:
      console.warn('Unknown document type for URL resolution:', documentType)
      return '#'
  }
}

// Helper to get link attributes
export const getLinkAttributes = (link: LinkLike) => {
  if (!link) return { href: '#', target: undefined, rel: undefined }

  const href = urlForReference(link)
  const isExternal =
    link.linkType === 'external' ||
    (link.externalUrl != null && !link.externalUrl.startsWith('/'))

  return {
    href,
    target: isExternal && link.openInNewTab ? '_blank' : undefined,
    rel: isExternal && link.openInNewTab ? 'noopener noreferrer' : undefined,
  }
}
