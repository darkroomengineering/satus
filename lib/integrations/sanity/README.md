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
import { sanityFetch } from 'next-sanity/live'
import { pageQuery } from '@/lib/integrations/sanity/queries'

export default async function Page({ params }) {
  const { data } = await sanityFetch({ 
    query: pageQuery, 
    params: { slug: params.slug } 
  })
  return <YourComponent data={data} />
}
```

### Build-time Data Fetching

For `generateStaticParams` or other build-time functions, use the client directly:

```tsx
import { client } from '@/lib/integrations/sanity/client'
import { allArticlesQuery } from '@/lib/integrations/sanity/queries'

export async function generateStaticParams() {
  if (!client) return []
  const data = await client.fetch(allArticlesQuery)
  return data.map((item) => ({ slug: item.slug?.current ?? '' }))
}
```

### Visual Editing

Add `data-sanity` attributes for visual editing:

```tsx
import { RichText } from '@/lib/integrations/sanity/components/rich-text'

function MyComponent({ data }) {
  return (
    <div data-sanity={data._id}>
      <h1 data-sanity="title">{data.title}</h1>
      <RichText content={data.content} />
    </div>
  )
}
```

### Image Handling

```tsx
import { urlForImage } from '@/lib/integrations/sanity/utils/image'
import { SanityImage } from '@/components/ui/sanity-image'

// Option 1: Using urlForImage utility
<img src={urlForImage(image).width(800).url()} alt={image.alt} />

// Option 2: Using SanityImage component
<SanityImage image={image} maxWidth={800} />
```

### SEO Metadata

```tsx
import { generateSanityMetadata } from '@/lib/utils/metadata'

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
3. **Create query** in `queries.ts`
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
