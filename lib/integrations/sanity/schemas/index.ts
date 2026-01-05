/**
 * Sanity Schema Types
 *
 * All schema definitions for Sanity CMS, organized in a flat structure.
 * This replaces the previous documents/objects/singletons directory structure.
 */

import type { SchemaTypeDefinition } from 'sanity'
import { article } from './article'
import { example } from './example'
// Import all schema definitions
import { link } from './link'
import { metadata } from './metadata'
import { navigation } from './navigation'
import { page } from './page'
import { richText } from './richText'

// Re-export all schemas for convenience
export { link, metadata, richText, article, example, page, navigation }

// Schema collection for Sanity configuration
export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Object types (reusable components)
    link,
    metadata,
    richText,

    // Document types (content pages)
    page,
    article,
    example,

    // Singleton types (one-off content)
    navigation,
  ],
}
