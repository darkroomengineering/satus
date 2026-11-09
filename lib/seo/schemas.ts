import { SITE } from './site'

/**
 * Typed schema.org node builders for JSON-LD.
 *
 * Never emit a key whose value is null, undefined, or an empty array: validators
 * flag `"description": null` and answer engines treat the entity as incomplete.
 * Optional fields are assigned only when present (an unconditional
 * `field: undefined` still emits the key).
 */

export const ORGANIZATION_ID = `${SITE.url}/#organization`
export const WEBSITE_ID = `${SITE.url}/#website`

interface PostalAddress {
  '@type': 'PostalAddress'
  addressCountry: string
}

export interface OrganizationSchema {
  '@context': 'https://schema.org'
  '@type': 'Organization'
  '@id': string
  name: string
  url: string
  logo: string
  description: string
  alternateName?: readonly string[]
  knowsAbout?: readonly string[]
  areaServed?: string
  foundingDate?: string
  email?: string
  sameAs?: readonly string[]
  address?: PostalAddress
}

export interface WebSiteSchema {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  '@id': string
  name: string
  url: string
  publisher: { '@id': string }
}

export interface BreadcrumbListItem {
  '@type': 'ListItem'
  position: number
  name: string
  item: string
}

export interface BreadcrumbListSchema {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: BreadcrumbListItem[]
}

interface ArticleAuthor {
  '@type': 'Person'
  name: string
}

export interface ArticleSchema {
  '@context': 'https://schema.org'
  '@type': 'Article'
  headline: string
  url: string
  publisher: { '@id': string }
  description?: string
  image?: string
  datePublished?: string
  dateModified?: string
  author?: ArticleAuthor
}

export type JsonLdSchema =
  | OrganizationSchema
  | WebSiteSchema
  | BreadcrumbListSchema
  | ArticleSchema

export function organizationSchema(): OrganizationSchema {
  const schema: OrganizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    description: SITE.description,
  }

  if (SITE.alternateNames.length) schema.alternateName = SITE.alternateNames
  if (SITE.knowsAbout.length) schema.knowsAbout = SITE.knowsAbout
  if (SITE.areaServed) schema.areaServed = SITE.areaServed
  if (SITE.foundingDate) schema.foundingDate = SITE.foundingDate
  if (SITE.email) schema.email = SITE.email
  if (SITE.sameAs.length) schema.sameAs = SITE.sameAs
  if (SITE.addressCountry) {
    schema.address = {
      '@type': 'PostalAddress',
      addressCountry: SITE.addressCountry,
    }
  }

  return schema
}

export function websiteSchema(): WebSiteSchema {
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
): BreadcrumbListSchema {
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

export interface ArticleSchemaInput {
  headline: string
  description?: string
  url: string
  image?: string
  datePublished?: string
  dateModified?: string
  authorName?: string
}

export function articleSchema(input: ArticleSchemaInput): ArticleSchema {
  const schema: ArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    url: input.url,
    publisher: { '@id': ORGANIZATION_ID },
  }

  if (input.description) schema.description = input.description
  if (input.image) schema.image = input.image
  if (input.datePublished) schema.datePublished = input.datePublished
  if (input.dateModified) schema.dateModified = input.dateModified
  if (input.authorName) {
    schema.author = { '@type': 'Person', name: input.authorName }
  }

  return schema
}
