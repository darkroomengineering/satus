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
NEXT_PUBLIC_SANITY_API_VERSION="2024-03-15"

# Optional, required for the revalidation webhook
SANITY_REVALIDATE_SECRET="your-webhook-secret"
```

> **Note**: Create tokens in [Sanity Dashboard](https://sanity.io/manage) → Your Project → API → Tokens.
>
> - **Viewer** token → `NEXT_PUBLIC_SANITY_API_READ_TOKEN`
> - **Editor** token → `SANITY_PRIVATE_TOKEN`
>
> With only `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`
> set, published content still renders — `sanityFetch` falls back to a plain,
> unauthenticated read. The two tokens above are only needed for Visual
> Editing, live preview, and draft mode; without them, those features are
> unavailable but the site keeps working.
>
> `SANITY_REVALIDATE_SECRET` is only needed to receive Sanity's revalidation
> webhook — set it on the webhook's signing secret in Sanity's dashboard.
> Without it, `app/api/revalidate/route.ts` returns `503` for Sanity webhook
> requests.

Env vars are validated with Zod schemas. Use `isConfigured('sanity')` from the integration registry to check if Sanity is properly configured.

### Vercel Marketplace

Satus supports the [Vercel Marketplace Sanity integration](https://vercel.com/marketplace) out of the box. The Marketplace auto-provisions env vars that Satus recognizes:

| Marketplace Var                 | Satus Var                           | Status                    |
| ------------------------------- | ----------------------------------- | ------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Same                                | Exact match               |
| `NEXT_PUBLIC_SANITY_DATASET`    | Same                                | Exact match               |
| `SANITY_API_READ_TOKEN`         | `NEXT_PUBLIC_SANITY_API_READ_TOKEN` | Both supported (fallback) |
| `SANITY_API_WRITE_TOKEN`        | `SANITY_PRIVATE_TOKEN`              | Both supported (fallback) |

No configuration changes needed — just install from the Marketplace and deploy.

`SANITY_STUDIO_PROJECT_ID` is a separate alias, unrelated to the Vercel Marketplace: it's Sanity's own CLI/template convention (the env var name `sanity init` and the CLI's template validator expect). Satus recognizes it as a fallback for `NEXT_PUBLIC_SANITY_PROJECT_ID`.

## Quick Start

1. Run Studio locally: `cd lib/integrations/sanity && bunx sanity dev`
2. Create content (Pages, Articles)
3. Click "Present" for visual editing

Deploy the Studio to Sanity's hosted domain (`https://<project>.sanity.studio`)
with `cd lib/integrations/sanity && bunx sanity deploy`.

## Usage

### Fetching Data

This project enables Next.js Cache Components (`cacheComponents: true`), and
`sanityFetch` calls `cacheTag()` internally — which is only legal inside a
`'use cache'` function. Wrap fetches in a `'use cache'` helper (this also
dedupes the fetch across the page and `generateMetadata`):

```tsx
import { draftMode } from 'next/headers'

import { sanityFetch } from '@/integrations/sanity/live'
import { pageQuery } from '@/integrations/sanity/queries'

async function fetchPage(
  slug: string,
  perspective: 'published' | 'drafts',
  stega: boolean
) {
  'use cache'
  return sanityFetch({ query: pageQuery, params: { slug }, perspective, stega })
}

async function fetchPageForRequest(slug: string) {
  const { isEnabled: isDraftMode } = await draftMode()
  return isDraftMode
    ? fetchPage(slug, 'drafts', true)
    : fetchPage(slug, 'published', false)
}

export default async function Page({ params }) {
  const { slug } = await params
  const { data } = await fetchPageForRequest(slug)
  return <YourComponent data={data} />
}
```

> Calling `sanityFetch` directly in a component (outside `'use cache'`) throws
> `cacheTag() can only be called inside a "use cache" function` while Cache
> Components are enabled.

### Build-time Data Fetching

For `generateStaticParams` or other build-time functions, use the client directly:

```tsx
import { client } from '@/integrations/sanity/client'
import { allArticlesQuery } from '@/integrations/sanity/queries'

export async function generateStaticParams() {
  if (!client) return []
  const data = await client.fetch(allArticlesQuery)
  return data.map((item) => ({ slug: item.slug?.current ?? '' }))
}
```

### Visual Editing

Add `data-sanity` attributes for visual editing:

```tsx
import { RichText } from '@/integrations/sanity/components/rich-text'

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
import { urlForImage } from '@/integrations/sanity/utils/image'
import { Image } from '@/components/ui/image'
import { SanityImage } from '@/components/ui/sanity-image'

// Option 1: Using urlForImage with the generic Image component
<Image src={urlForImage(image).width(800).url()} alt={image.alt} width={800} height={600} />

// Option 2: Using SanityImage component
<SanityImage image={image} maxWidth={800} />
```

A raw `<img>` is not an option here — oxlint's `nextjs/no-img-element` rule rejects it project-wide.

### SEO Metadata

Reuse the same `'use cache'` loader so the document is fetched once per request:

```tsx
import { generateSanityMetadata } from '@/lib/utils/metadata'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const { data } = await fetchPageForRequest(slug) // the helper from above
  return generateSanityMetadata({ document: data, url: `/page/${slug}` })
}
```

## Creating New Content Types

1. **Create schema** in `schemas/`:

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

2. **Add to schema index** in `schemas/index.ts`
3. **Create query** in `queries.ts`
4. **Create page** in `app/`

## Caching

- `sanityFetch` calls `cacheTag()` internally, so every call must run inside a `'use cache'` function (see [Fetching Data](#fetching-data) above)
- Revalidation happens via the webhook route (`app/api/revalidate/route.ts`), which calls `revalidateTag()` when Sanity's webhook fires
- Draft mode switches `sanityFetch` to the draft perspective instead of relying on a separate no-store fetch path

See [ARCHITECTURE.md](../../../ARCHITECTURE.md) for cache gotchas.

## Deploying the Studio

`sanity` and `@sanity/vision` sit in `devDependencies` even though `/studio` is part of the shipped app. That works on any host: Next compiles the Studio into the server chunk during `next build`, so nothing resolves `sanity` from `node_modules` at request time. Pruning dev dependencies on the server after a successful build is safe, and no `serverExternalPackages` entry is needed.

The one thing that matters is that both packages are installed when `next build` runs. A pipeline that installs production-only dependencies _before_ building will fail the build, the same way it would for Tailwind or TypeScript.

## Troubleshooting

**Visual editor not loading:**

- Check env vars are set correctly
- Verify draft mode routes exist (`/api/draft-mode/enable`)

**Content not updating:**

- Hard refresh browser
- Check revalidation webhook is configured

**Related**: [Sanity Docs](https://www.sanity.io/docs) · [Parent README](../README.md)
