# Sanity CMS Integration

Headless CMS with visual editing. Published content is cached under one tag and refreshed by a signed publish webhook; drafts are read only in draft mode. There is no Sanity Live and no token in the browser.

```
 PUBLISHED SITE                              EDITOR IN PRESENTATION
 ┌──────────┐  publish  ┌──────────────┐     ┌──────────┐  iframe   ┌────────────────────┐
 │  Studio  │──────────▶│  Sanity API  │     │  Studio  │──────────▶│ /api/draft-mode/   │
 └──────────┘           └──────┬───────┘     └────┬─────┘           │ enable             │
                    signed POST│                  │ edit            └─────────┬──────────┘
                               ▼                  ▼                           ▼
                     ┌──────────────────┐   ┌──────────────┐  router   ┌────────────────┐
                     │ /api/revalidate  │   │ VisualEditing│──refresh─▶│ sanityFetch    │
                     │ revalidateTag    │   └──────────────┘           │ draft/release  │
                     │ ('sanity')       │                              │ stega,no-store │
                     └────────┬─────────┘                              └────────────────┘
                              ▼
                     ┌──────────────────┐
                     │ next visit: fresh│
                     │ page             │
                     └──────────────────┘
```

## Environment Variables

```env
# Required
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"

# Draft mode (a Viewer token, server only) and the publish webhook
SANITY_API_READ_TOKEN="your-viewer-token"
SANITY_REVALIDATE_SECRET="your-webhook-secret"

# Optional
NEXT_PUBLIC_SANITY_API_VERSION="2025-03-01"
```

- Create the token in [sanity.io/manage](https://sanity.io/manage) → your project → API → Tokens, with the **Viewer** role. It is read on the server only (`env.SANITY_API_READ_TOKEN`); never put it in a `NEXT_PUBLIC_*` variable, which would inline it into the browser bundle. No write token is needed: nothing in the starter writes to Sanity.
- With only the project ID and dataset set, published content renders. Without the token, draft mode and Presentation are unavailable: `/api/draft-mode/enable` answers `503`.
- Without `SANITY_REVALIDATE_SECRET`, `/api/revalidate` answers `503` to Sanity's webhook, and published content stays cached for up to 30 days (see [Revalidation](#revalidation)).

Env vars are validated with Zod schemas. Use `isConfigured('sanity')` from the integration registry to check if Sanity is properly configured.

### Vercel Marketplace

Satus supports the [Vercel Marketplace Sanity integration](https://vercel.com/marketplace) out of the box. The Marketplace auto-provisions env vars that Satus recognizes:

| Marketplace Var                 | Satus Var | Status      |
| ------------------------------- | --------- | ----------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Same      | Exact match |
| `NEXT_PUBLIC_SANITY_DATASET`    | Same      | Exact match |
| `SANITY_API_READ_TOKEN`         | Same      | Exact match |

The Marketplace may also provision `SANITY_API_WRITE_TOKEN`. Satus ignores it; delete it from the project if nothing else of yours uses it.

No configuration changes needed — just install from the Marketplace and deploy.

`SANITY_STUDIO_PROJECT_ID` is a separate alias, unrelated to the Vercel Marketplace: it's Sanity's own CLI/template convention (the env var name `sanity init` and the CLI's template validator expect). Satus recognizes it as a fallback for `NEXT_PUBLIC_SANITY_PROJECT_ID`.

## Quick Start

1. Run Studio locally: `cd lib/integrations/sanity && bunx sanity dev`
2. Create content (Pages, Articles)
3. Click "Present" for visual editing

Deploy the Studio to Sanity's hosted domain (`https://<project>.sanity.studio`)
with `cd lib/integrations/sanity && bunx sanity deploy`.

The CLI reads `package.json` from this folder, not the root, and won't start
unless it declares `sanity` and `styled-components`. The folder's
`package.json` restates both; the root one installs them.
`studio-manifest.test.ts` fails if the root stops declaring either or a major
bump leaves the installed version outside the folder's range; bump the folder
range in the same commit.

### Studio structure

`sanity.config.ts` sets the sidebar by hand: collections first, then
singletons. A singleton is a type with exactly one document, listed in
`SINGLETONS` and registered as `document.singletons`. Sanity keeps it out of
"create new" and drops Duplicate; the config also drops Delete and
Unpublish, because the site reads it by id. To add one, define the document
type, add its name to `SINGLETONS`, and give it an icon from `@sanity/icons`.

The embedded Studio runs under its own CSP on `/studio/*` (`isStudio` in
`lib/integrations/csp.ts`); a plugin that loads from a new host adds it to
`STUDIO_SOURCES` there.

## Usage

### Fetching Data

Read content through `sanityFetch` straight from a Server Component or `generateMetadata`. It owns its cache boundary, so the call site needs no `'use cache'`:

```tsx
import { notFound } from 'next/navigation'

import { sanityFetch } from '@/integrations/sanity/fetch'
import { pageQuery } from '@/integrations/sanity/queries'

export default async function Page({ params }) {
  const { slug } = await params
  const data = await sanityFetch({ query: pageQuery, params: { slug } })
  if (!data) notFound()
  return <YourComponent data={data} />
}
```

- `sanityFetch` returns the query result, or `null` when Sanity isn't configured.
- Outside draft mode it calls `sanityFetchPublished` (`published.ts`): a `'use cache'` function tagged `sanity`, with `cacheLife('max')`, reading published content from the live API, not the API CDN (a stale CDN answer right after a publish would be cached until the next one). Outside draft mode the page and `generateMetadata` share its cache entry.
- In draft mode, with `SANITY_API_READ_TOKEN` set, it reads the perspective Presentation picks (drafts by default, or the content release an editor selects), with stega markers, `useCdn: false` and no cache. Presentation stores the pick in the `sanity-preview-perspective` cookie, and `resolvePerspectiveFromCookies` from `next-sanity/live` reads it.
- `sanityFetchPublished` reads published content only. Use it outside a page request, like the sitemap (`lib/seo/routes.ts`) or `generateStaticParams`, where draft mode can't be read:

```tsx
import { sanityFetchPublished } from '@/integrations/sanity/published'
import { allArticlesQuery } from '@/integrations/sanity/queries'

export async function generateStaticParams() {
  const data = await sanityFetchPublished({ query: allArticlesQuery })
  return (data ?? []).map((item) => ({ slug: item.slug?.current ?? '' }))
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
import { stegaClean } from '@sanity/client/stega'
import { urlForImage } from '@/integrations/sanity/utils/image'
import { Image } from '@/components/ui/image'
import { SanityImage } from '@/components/ui/sanity-image'

// Option 1: Using urlForImage with the generic Image component
<Image src={urlForImage(image).url()} alt={stegaClean(image.alt) ?? ''} width={800} height={600} />

// Option 2: Using SanityImage component (reads and cleans `image.alt` itself)
<SanityImage image={image} maxWidth={800} />
```

Every image field carries an editor-written `alt`, defined once as `altField` in `schemas/fields.ts`; add it to a new image field's `fields`. It's optional, and an empty one renders `alt=""`, which marks the image as decorative. Rich text images override it to required. Project `alt` in the query (a bare `image` or `...` projection already includes it). Run it through `stegaClean` before it reaches the DOM: in draft mode every Sanity string carries hidden edit markers. Import `stegaClean` from `@sanity/client/stega` in client components, since `next-sanity`'s root entry pulls the whole client into the bundle.

`Image` gives any `cdn.sanity.io` URL a loader (`components/ui/image/sanity-loader.ts`): Sanity's CDN resizes each `srcset` width itself, as WebP, and Next's optimizer never sees the image (`cdn.sanity.io` is not in `images.remotePatterns`). The loader sets `w` per candidate, so a width on the URL is overwritten; a `rect` crop is kept. `SanityImage` also takes the aspect ratio from the editor's crop and keeps their hotspot in view under `object-cover`.

A raw `<img>` is not an option here — oxlint's `nextjs/no-img-element` rule rejects it project-wide.

### SEO Metadata

Call `sanityFetch` again. Outside draft mode it reuses the page's cache entry; in draft mode nothing is cached, so it reads Sanity a second time:

```tsx
import { generateSanityMetadata } from '@/lib/utils/metadata'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const data = await sanityFetch({ query: pageQuery, params: { slug } })
  if (!data) return
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

## Revalidation

Create the webhook in [sanity.io/manage](https://sanity.io/manage) → your project → API → Webhooks: URL `https://your-domain.com/api/revalidate`, method POST, trigger on create, update and delete, and a secret. Set the same secret as `SANITY_REVALIDATE_SECRET`.

`app/api/revalidate/route.ts` dispatches requests carrying a `sanity-webhook-signature` header to `revalidate()` in `revalidate.ts`, which verifies the signature with `parseBody` from `next-sanity/webhook`, then calls `revalidateTag('sanity', { expire: 0 })`. One tag covers every page, because a per-type tag would miss a page that shows a referenced document of another type. `expire: 0` means the next visit renders fresh content instead of one more stale page.

`parseBody`'s third argument (`true`) only sleeps a fixed 3 seconds after a valid signature (next-sanity 13.3.4); it does not check that the new version is being served. The refetch sees it because published reads use `useCdn: false` (`client.ts`): the live API answers with the new version as soon as the publish lands, where the API CDN could still return the old one, and that answer would be cached until the next publish. The cost is that every cache miss reads from the live API, which the cache keeps rare.

The webhook is the only thing that refreshes published content. Without it, a cache entry lives until `cacheLife('max')` revalidates it, 30 days later. See [ARCHITECTURE.md](../../../ARCHITECTURE.md) for the diagram.

## Draft mode

Presentation enables draft mode through `/api/draft-mode/enable` (`defineEnableDraftMode`, using the Viewer token to validate its preview secret). `app/(site)/layout.tsx` then renders `SanityVisualEditing` (`components/visual-editing.tsx`), which draws the click-to-edit overlays and calls `router.refresh()` when an editor changes a field, so the preview follows typing without Sanity Live. `DisableDraftMode` (`components/disable-draft-mode.tsx`, wired into the `/sanity` example layout) shows a "Disable Draft Mode" link outside the Studio frame: a plain `<a>`, because prefetching `/api/draft-mode/disable` would turn draft mode off.

## Types

After changing a schema or a query:

```bash
bun run sanity:extract
bun run sanity:typegen
```

Typegen reads the `typegen` key in `sanity.cli.ts` (the separate `sanity-typegen.json` is deprecated by the Sanity CLI).

## Deploying the Studio

`sanity` sits in `devDependencies` even though `/studio` is part of the shipped app. That works on any host: Next compiles the Studio into the server chunk during `next build`, so nothing resolves `sanity` from `node_modules` at request time. Pruning dev dependencies on the server after a successful build is safe, and no `serverExternalPackages` entry is needed.

The one thing that matters is that it is installed when `next build` runs. A pipeline that installs production-only dependencies _before_ building will fail the build, the same way it would for Tailwind or TypeScript.

## Troubleshooting

**Visual editor not loading:**

- Check env vars are set correctly
- Verify draft mode routes exist (`/api/draft-mode/enable`)

**Content not updating:**

- Check the webhook exists, points at `/api/revalidate`, and its secret matches `SANITY_REVALIDATE_SECRET` (the webhook's attempt log in sanity.io/manage shows a `401` for a wrong secret and a `503` for an unset one)
- Draft mode not refreshing while typing: check `SANITY_API_READ_TOKEN` is set and the page renders inside `app/(site)/layout.tsx`

**Related**: [Sanity Docs](https://www.sanity.io/docs) · [Parent README](../README.md)
