import type { SchemaTypeDefinition } from 'sanity'
import { metadata } from './metadata'
import { article } from './pages/article'
import { page } from './pages/page'
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
