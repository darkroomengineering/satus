import type { Link } from '../sanity.types'

type InternalReference = {
  _type: string
  slug?: { current: string }
  title?: string
}

export const urlForReference = (link: Link): string => {
  if (!link) return '#'

  // External URL
  if (link.linkType === 'external' && link.externalUrl) {
    return link.externalUrl
  }

  // Internal path (manual URL entry)
  if (link.linkType === 'internal' && link.internalLink) {
    return link.internalLink._ref
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
    link.linkType === 'external' ||
    (link.externalUrl && !link.externalUrl.startsWith('/'))

  return {
    href,
    target: isExternal && link.openInNewTab ? '_blank' : undefined,
    rel: isExternal && link.openInNewTab ? 'noopener noreferrer' : undefined,
  }
}
