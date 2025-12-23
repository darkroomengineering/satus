import type { SchemaTypeDefinition } from 'sanity'
import { article } from './documents/article'
import { page } from './documents/page'
import { link } from './objects/link'
import { metadata } from './objects/metadata'
import { richText } from './objects/richText'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Object types
    link,
    metadata,
    richText,

    // Document types
    page,
    article,
  ],
}
