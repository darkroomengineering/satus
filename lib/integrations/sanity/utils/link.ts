import { stegaClean } from 'next-sanity'

/**
 * Structural shape of a `sanity-plugin-link-field` value, raw or with its
 * internal reference dereferenced (`internalLink->{_type, slug}`). Kept
 * permissive so the TypeGen output for both satisfies it without coupling
 * this util to either generated type.
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
 * Schemes allowed on a rendered external `href`. The plugin's `url` field
 * only accepts http(s) and relative URLs in the Studio, but that schema check
 * is advisory, never enforced by the Sanity content API: a write token, a
 * content import, or a direct API write can still plant a `javascript:` (or
 * other dangerous-scheme) URL that reaches this anchor's `href`. Re-check at
 * render time so a bad scheme becomes an inert `#` instead of executing.
 * `mailto:` and `tel:` stay allowed because both are inert and a link written
 * outside the Studio may still carry one in `url`.
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

/**
 * Resolves a Sanity link to an `href`, or `#` when it resolves to nothing.
 * In draft mode Presentation's stega encoding can append invisible edit
 * markers to link strings (a relative `#anchor` or `?query` URL is not
 * recognised as a URL and gets encoded), so the input is cleaned here rather
 * than by each caller.
 */
export const urlForReference = (raw: LinkLike): string => {
  const link = stegaClean(raw)
  if (!link) return '#'

  switch (link.type) {
    // Reject any scheme outside the allowlist (see isSafeExternalUrl) so CMS
    // content can't inject a `javascript:` href.
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

/** Appends the plugin's optional `parameters` and `anchor` fields. */
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

/**
 * `href`, `target` and `rel` for a Sanity link, ready to spread onto `Link`
 * from `@/components/ui/link`. Pass `target` and `rel` even when undefined:
 * `Link` opens every absolute http(s) URL in a new tab on its own, and an
 * explicit `undefined` is what turns that off for a link whose editor
 * switched "open in new window" off.
 *
 * New tab is tri-state. The plugin's `blank` wins whenever it is set, either
 * way; an unset `blank` (a link saved before the toggle existed, or never
 * touched) falls back to opening absolute http(s) URLs in a new tab.
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
