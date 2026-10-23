import { stegaClean } from 'next-sanity'

/**
 * Shape of a `sanity-plugin-link-field` value, raw or dereferenced
 * (`internalLink->{_type, slug}`). Permissive so TypeGen output for both
 * satisfies it.
 */
type LinkLike = {
  type?: string | null
  url?: string | null
  email?: string | null
  phone?: string | null
  parameters?: string | null
  anchor?: string | null
  blank?: boolean | null
  internalLink?: {
    _type?: string | null
    slug?: { current?: string | null } | null
  } | null
} | null

/**
 * Schemes allowed on a rendered external `href`. The Studio's http(s)-only
 * `url` check is advisory; the content API doesn't enforce it, so a write
 * token, import or direct write can plant a `javascript:` URL. Re-checked at
 * render so it becomes an inert `#`. `mailto:` and `tel:` are inert and may
 * appear in `url` when written outside the Studio.
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

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('?')
  ) {
    return true
  }

  try {
    // A scheme-bearing URL keeps its own protocol, so `javascript:`/`data:`
    // fail the allowlist; the base only resolves relative inputs.
    return SAFE_EXTERNAL_SCHEMES.has(
      new URL(trimmed, 'http://localhost').protocol
    )
  } catch {
    return false
  }
}

/**
 * Resolves a Sanity link to an `href`, or `#` when it resolves to nothing.
 * Cleans the input because draft-mode stega encoding can append invisible
 * edit markers to link strings (a relative `#anchor` or `?query` gets encoded).
 */
export const urlForReference = (raw: LinkLike): string => {
  const link = stegaClean(raw)
  if (!link) return '#'

  switch (link.type) {
    case 'external':
      return link.url && isSafeExternalUrl(link.url)
        ? withSuffix(link.url, link)
        : '#'
    case 'internal': {
      if (!link.internalLink) return '#'
      const path = resolveDocumentUrl(
        link.internalLink._type ?? undefined,
        link.internalLink.slug?.current ?? undefined
      )
      return path === '#' ? path : withSuffix(path, link)
    }
    case 'email': {
      // `?`, `&` and `#` would start mailto headers (`?bcc=`) or a fragment.
      const email = link.email?.trim()
      return email && !/[?&#]/.test(email) ? `mailto:${email}` : '#'
    }
    case 'phone': {
      // Spaces are not allowed in a `tel:` URL.
      const phone = link.phone?.replace(/\s+/g, '')
      return phone ? `tel:${phone}` : '#'
    }
    default:
      return '#'
  }
}

function withSuffix(href: string, link: NonNullable<LinkLike>): string {
  const query = link.parameters?.trim().replace(/^[?&]+/, '')
  const hash = link.anchor?.trim().replace(/^#/, '')
  if (!query && !hash) return href

  const cut = href.indexOf('#')
  const base = cut === -1 ? href : href.slice(0, cut)
  const withQuery = query
    ? `${base}${base.includes('?') ? '&' : '?'}${query}`
    : base

  return hash
    ? `${withQuery}#${hash}`
    : `${withQuery}${href.slice(base.length)}`
}

// Every document type listed in `linkField({ linkableSchemaTypes })` in
// `../sanity.config.ts` needs a case here, or links to it resolve to `#`.
function resolveDocumentUrl(documentType?: string, slug?: string): string {
  if (!slug || !isSafeInternalSlug(slug)) return '#'

  switch (documentType) {
    // `home` maps to `/home`, not `/`: `/` is the developer-owned
    // `app/(site)/page.tsx` and the catch-all can't match an empty segment.
    case 'page':
      return `/${slug}`
    case 'article':
      return `/articles/${slug}`
    default:
      console.warn('Unknown document type for URL resolution:', documentType)
      return '#'
  }
}

/**
 * `href`, `target` and `rel` to spread onto `Link` (`@/components/ui/link`).
 * Pass `target` and `rel` even when undefined: `Link` opens absolute http(s)
 * URLs in a new tab itself, and an explicit `undefined` turns that off.
 *
 * New tab is tri-state: the plugin's `blank` wins when set; unset falls back
 * to a new tab for absolute http(s) URLs.
 */
export const getLinkAttributes = (raw: LinkLike) => {
  const link = stegaClean(raw)
  const href = urlForReference(link)
  if (!link || href === '#') {
    return { href: '#', target: undefined, rel: undefined }
  }

  const newTab = link.blank ?? /^https?:\/\//i.test(href)

  return {
    href,
    target: newTab ? '_blank' : undefined,
    rel: newTab ? 'noopener noreferrer' : undefined,
  }
}
