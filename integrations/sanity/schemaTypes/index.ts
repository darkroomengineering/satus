import type { SchemaTypeDefinition } from 'sanity'
import { article } from './article'
import { metadata } from './metadata'
import { page } from './page'
import { richText } from './richText'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Object types
    metadata,
    richText,

    // Document types
    page,
    article,
  ],
}
