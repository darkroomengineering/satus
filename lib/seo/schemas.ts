import { SITE } from './site'

/**
 * Pure schema.org node builders for JSON-LD.
 *
 * Hard rule: never emit a key whose value is null, undefined, or an empty
 * array. A `"description": null` is actively worse than an absent key —
 * validators flag it and answer engines treat the entity as incomplete.
 * Every optional field below is added with a conditional spread
 * (`...(x ? { x } : {})`), matching the pattern used elsewhere in this repo.
 */

export const ORGANIZATION_ID = `${SITE.url}/#organization`
export const WEBSITE_ID = `${SITE.url}/#website`

export function organizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    description: SITE.description,
    ...(SITE.alternateNames.length
      ? { alternateName: SITE.alternateNames }
      : {}),
    ...(SITE.knowsAbout.length ? { knowsAbout: SITE.knowsAbout } : {}),
    ...(SITE.areaServed ? { areaServed: SITE.areaServed } : {}),
    ...(SITE.foundingDate ? { foundingDate: SITE.foundingDate } : {}),
    ...(SITE.email ? { email: SITE.email } : {}),
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
    ...(SITE.addressCountry
      ? {
          address: {
            '@type': 'PostalAddress',
            addressCountry: SITE.addressCountry,
          },
        }
      : {}),
  }
}

export function websiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    url: SITE.url,
    publisher: { '@id': ORGANIZATION_ID },
  }
}

export function breadcrumbSchema(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * A listing page — index, archive, category — as `CollectionPage` wrapping an
 * `ItemList` of what it links to.
 *
 * Without this a listing is just a page of links: a crawler has to follow
 * every one to learn what the collection contains, and an answer engine
 * asking "what has this studio worked on?" has nothing to read in one fetch.
 * The `ItemList` states the membership and the order directly.
 *
 * `url` and every item `url` must be absolute — relative paths are dropped by
 * most consumers, and a half-relative `ItemList` validates clean while
 * pointing nowhere.
 */
export function collectionPageSchema(input: {
  name: string
  url: string
  description?: string
  items: { name: string; url: string }[]
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: input.url,
    isPartOf: { '@id': WEBSITE_ID },
    ...(input.description ? { description: input.description } : {}),
    // An empty list is worse than no list: it asserts the collection is
    // empty rather than leaving the question open.
    ...(input.items.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: input.items.length,
            itemListElement: input.items.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              url: item.url,
            })),
          },
        }
      : {}),
  }
}

export function articleSchema(input: {
  headline: string
  description?: string
  url: string
  image?: string
  datePublished?: string
  dateModified?: string
  authorName?: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    url: input.url,
    publisher: { '@id': ORGANIZATION_ID },
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.authorName
      ? { author: { '@type': 'Person', name: input.authorName } }
      : {}),
  }
}
