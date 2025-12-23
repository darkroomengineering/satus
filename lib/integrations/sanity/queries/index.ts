import { groq } from 'next-sanity'

// Helper for rich text content with link projections
const richTextWithLinks = `
  content[]{
    ...,
    markDefs[]{
      ...,
      _type == "link" => {
        ...,
        internalLink->{_type, slug, title}
      }
    }
  }
`

const linkWithLabel = `
  link {
    ...,
    internalLink->{_type, slug, title}
  }
`

// Page queries
export const pageQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    ${richTextWithLinks},
    ${linkWithLabel},
    metadata,
    publishedAt,
    _updatedAt
  }
`

export const pageByIdQuery = groq`
  *[_type == "page" && _id == $id][0] {
    _id,
    title,
    slug,
    ${richTextWithLinks},
    metadata,
    publishedAt,
    _updatedAt
  }
`

// Article queries
export const articleQuery = groq`
  *[_type == "article" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    ${richTextWithLinks},
    categories,
    tags,
    author,
    publishedAt,
    metadata,
    _updatedAt
  }
`

export const allArticlesQuery = groq`
  *[_type == "article"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    categories,
    tags,
    author,
    publishedAt,
    metadata,
    _updatedAt
  }
`

export const articleByIdQuery = groq`
  *[_type == "article" && _id == $id][0] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    ${richTextWithLinks},
    categories,
    tags,
    author,
    publishedAt,
    metadata,
    _updatedAt
  }
`
