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
