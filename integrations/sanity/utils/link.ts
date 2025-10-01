import type { Link } from '../sanity.types'

type InternalReference = {
  _type: string
  slug?: { current: string }
  title?: string
}

export const urlForReference = (link: Link): string => {
  if (!link) return '#'

  // External URL
  if (link.type === 'external' && link.url) {
    return link.url
  }

  // Internal path (manual URL entry)
  if (link.type === 'internal' && link.url) {
    return link.url
  }

  // Internal reference (dereferenced document)
  if (
    link.internalLink &&
    typeof link.internalLink === 'object' &&
    'slug' in link.internalLink
  ) {
    const ref = link.internalLink as InternalReference
    return resolveDocumentUrl(ref._type, ref.slug?.current)
  }

  // Email
  if (link.email) {
    return `mailto:${link.email}`
  }

  // Phone
  if (link.phone) {
    return `tel:${link.phone}`
  }

  return '#'
}

function resolveDocumentUrl(documentType: string, slug?: string): string {
  if (!slug) return '#'

  switch (documentType) {
    case 'page':
      return slug === 'home' ? '/' : `/${slug}`
    default:
      console.warn('Unknown document type for URL resolution:', documentType)
      return '#'
  }
}

// Helper to get link attributes
export const getLinkAttributes = (link: Link | null) => {
  if (!link) return { href: '#', target: undefined, rel: undefined }

  const href = urlForReference(link)
  const isExternal =
    link.type === 'external' || (link.url && !link.url.startsWith('/'))

  return {
    href,
    target: isExternal && link.blank ? '_blank' : undefined,
    rel: isExternal && link.blank ? 'noopener noreferrer' : undefined,
  }
}
