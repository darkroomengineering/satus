# Sanity CMS Integration

Headless CMS with visual editing.

## Environment Variables

```env
# Required
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"

# Required for Visual Editing & Live Preview
NEXT_PUBLIC_SANITY_API_READ_TOKEN="your-viewer-token"
SANITY_PRIVATE_TOKEN="your-editor-token"

# Optional
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
NEXT_PUBLIC_SANITY_API_VERSION="2024-03-15"
```

> **Note**: Create tokens in [Sanity Dashboard](https://sanity.io/manage) → Your Project → API → Tokens.
> - **Viewer** token → `NEXT_PUBLIC_SANITY_API_READ_TOKEN`
> - **Editor** token → `SANITY_PRIVATE_TOKEN`

## Quick Start

1. Access Studio at `/studio`
2. Create content (Pages, Articles)
3. Click "Present" for visual editing

## Usage

### Fetching Data

```tsx
import { sanityFetch } from '@/lib/integrations/sanity/live'
import { pageQuery } from '@/lib/integrations/sanity/queries'

export default async function Page({ params }) {
  const { data } = await sanityFetch({ 
    query: pageQuery, 
    params: { slug: params.slug } 
  })
  return <YourComponent data={data} />
}
```

### Visual Editing

Add `data-sanity` attributes:

```tsx
import { useSanityContext, RichText } from '@/lib/integrations/sanity'

function MyComponent() {
  const { document } = useSanityContext()
  return (
    <div data-sanity={document._id}>
      <h1 data-sanity="title">{document.title}</h1>
      <RichText content={document.content} />
    </div>
  )
}
```

### SEO Metadata

```tsx
import { generateSanityMetadata } from '@/utils'

export async function generateMetadata({ params }) {
  const { data } = await sanityFetch({ query: pageQuery, params })
  return generateSanityMetadata({ document: data, url: `/page/${params.slug}` })
}
```

## Creating New Content Types

1. **Create schema** in `schemaTypes/`:

```typescript
import { defineField, defineType } from 'sanity'

export const landing = defineType({
  name: 'landing',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string' }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' } }),
    defineField({ name: 'content', type: 'richText' }),
  ],
})
```

2. **Add to schema index** in `schemaTypes/index.ts`
3. **Create query** in `queries/index.ts`
4. **Create page** in `app/`

## Caching

- **Draft mode**: Uses `cache: 'no-store'` automatically
- **Published content**: ISR with `revalidate: 3600`
- All queries use `cacheSignal()` for automatic cleanup

See [ARCHITECTURE.md](../../../ARCHITECTURE.md) for cache gotchas.

## Troubleshooting

**Visual editor not loading:**
- Check env vars are set correctly
- Verify draft mode routes exist (`/api/draft-mode/enable`)

**Content not updating:**
- Hard refresh browser
- Check revalidation webhook is configured

**Related**: [Sanity Docs](https://www.sanity.io/docs) · [Parent README](../README.md)
