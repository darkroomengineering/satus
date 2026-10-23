import type { SchemaTypeDefinition } from 'sanity'

import { article } from './article'
import { metadata } from './metadata'
import { navigation } from './navigation'
import { page } from './page'
import { richText } from './richText'

export { article, metadata, navigation, page, richText }

export const schema = {
  types: [
    // Object types. `link` comes from sanity-plugin-link-field, registered in
    // `../sanity.config.ts`.
    metadata,
    richText,

    // Document types
    page,
    article,

    // Singleton types
    navigation,
  ],
} satisfies { types: SchemaTypeDefinition[] }
