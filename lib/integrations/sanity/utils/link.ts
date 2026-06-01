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

export const urlForReference = (link: LinkLike): string => {
  if (!link) return '#'

  // External URL
  if (link.linkType === 'external' && link.externalUrl) {
    return link.externalUrl
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
  if (!slug) return '#'

  switch (documentType) {
    case 'page':
      return slug === 'home' ? '/' : `/${slug}`
    case 'article':
      return `/sanity/${slug}`
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
