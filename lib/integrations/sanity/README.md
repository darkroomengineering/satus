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

Read content through `sanityFetch` straight from a Server Component or `generateMetadata`. It sets its own caching, so the call site needs nothing else:

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
- Outside draft mode it calls `sanityFetchPublished` (`published.ts`): a fetch tagged `sanity` in Next's Data Cache, with a 30-day `revalidate` backstop, reading published content from the live API, not the API CDN (a stale CDN answer right after a publish would be cached until the next one). Outside draft mode the page and `generateMetadata` share its cache entry.
- In draft mode, with `SANITY_API_READ_TOKEN` set, it reads the perspective Presentation picks (drafts by default, or the content release an editor selects), with stega markers and no cache (the base client already skips the API CDN). Presentation stores the pick in the `sanity-preview-perspective` cookie, and `resolvePerspectiveFromCookies` from `next-sanity/live` reads it.
- A route that renders per request from a URL slug checks `isKnownCmsPath` (`known-path.ts`) before its `sanityFetch`, as `app/(site)/[...slug]` and `app/(site)/articles/[slug]` do. Each published read is cached, a `null` miss included, so without the check every random slug writes a Data Cache entry. It compares the path with the sitemap's published route list (one cached read) and skips the check in draft mode, where unpublished drafts must still preview.
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
import { stegaClean } from 'next-sanity'
import { urlForImage } from '@/integrations/sanity/utils/image'
import { Image } from '@/components/ui/image'
import { SanityImage } from '@/components/ui/sanity-image'

// Option 1: Using urlForImage with the generic Image component
<Image src={urlForImage(image).url()} alt={stegaClean(image.alt) ?? ''} width={800} height={600} />

// Option 2: Using SanityImage component (reads and cleans `image.alt` itself)
<SanityImage image={image} maxWidth={800} />
```

Every image field carries an editor-written `alt`, defined once as `altField` in `schemas/fields.ts`; add it to a new image field's `fields`. It's optional, and an empty one renders `alt=""`, which marks the image as decorative. Rich text images override it to required. Project `alt` in the query (a bare `image` or `...` projection already includes it). Run it through `stegaClean` before it reaches the DOM: in draft mode every Sanity string carries hidden edit markers. Import it from `next-sanity`, as the rest of the repo does. Two of these alt fields reach no page yet: no query reads the navigation document, so `socials[].logo` never renders, and `metadata.image` isn't dereferenced into the Open Graph tags (see `generateSanityMetadata`). Wire them through `SanityImage` when a fork renders either.

`Image` gives any `cdn.sanity.io` URL a loader (`components/ui/image/sanity-loader.ts`): Sanity's CDN resizes each `srcset` width itself, as WebP, and Next's optimizer never sees the image (`cdn.sanity.io` is not in `images.remotePatterns`). The loader sets `w` per candidate, so a width on the URL is overwritten; a `rect` crop is kept. `SanityImage` also takes the aspect ratio from the editor's crop and keeps their hotspot in view under `object-cover`.

The WebGL `Image` (`@/webgl/components/image`) loads its texture from the same `cdn.sanity.io` URL with a CORS request, and Sanity's CDN answers an origin missing from the project's CORS list with a 403. Add every origin the site is served from to the project's CORS origins (manage.sanity.io > API > CORS origins), including a wildcard for preview deploys (`https://*.vercel.app`) and `http://localhost:3000`. No credentials are needed. A refused origin falls back to the plain DOM image, so the only symptom is a missing WebGL effect.

A raw `<img>` is not an option here — oxlint's `nextjs/no-img-element` rule rejects it project-wide.

### SEO Metadata

Call `sanityFetch` again. Outside draft mode it reuses the page's cache entry; in draft mode nothing is cached, so it reads Sanity a second time:

```tsx
import { stegaClean } from 'next-sanity'
import { generateSanityMetadata } from '@/lib/utils/metadata'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const data = await sanityFetch({ query: pageQuery, params: { slug } })
  if (!data) return
  // Clean first: in draft mode every string carries hidden edit markers, and
  // the helper doesn't clean for itself.
  return generateSanityMetadata({
    document: stegaClean(data),
    url: `/page/${slug}`,
  })
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
5. **Regenerate types**: `bun run sanity:extract && bun run sanity:typegen`

`sanity:extract` overwrites `schema.json` and needs no Sanity project. The
CLI only reads the schema, but `sanity.config.ts` exports `null` when no
project ID is set, and the CLI rejects that as an invalid Studio config. So
the script passes the placeholder `SANITY_STUDIO_PROJECT_ID=extract-only`
after the env files. A project ID from your env or shell wins over it. The
placeholder names no real project, so extraction cannot depend on one, and no
other script sets it.

An empty `NEXT_PUBLIC_SANITY_PROJECT_ID=` line in `.env.local` (or an empty
shell value) also wins over the placeholder: `env.ts` falls back with `??`, so
an empty string counts as set, the config exports `null` again, and extract
fails with "Invalid studio config format". Delete or comment out the empty
line instead of leaving it blank.

## Revalidation

Create the webhook in [sanity.io/manage](https://sanity.io/manage) → your project → API → Webhooks: URL `https://your-domain.com/api/revalidate`, method POST, trigger on create, update and delete, and a secret. Set the same secret as `SANITY_REVALIDATE_SECRET`.

`app/api/revalidate/route.ts` dispatches requests carrying a `sanity-webhook-signature` header to `revalidate()` in `revalidate.ts`, which verifies the signature with `parseBody` from `next-sanity/webhook`, then calls `revalidateTag('sanity', { expire: 0 })`. One tag covers every page, because a per-type tag would miss a page that shows a referenced document of another type. `expire: 0` means the next visit renders fresh content instead of one more stale page.

`parseBody`'s third argument (`true`, named `waitForContentLakeEventualConsistency` in next-sanity) sleeps a fixed 3 seconds after a valid signature. Content Lake is eventually consistent, so a query sent the moment the webhook fires can still get the old version; the sleep is a hedge against that replication lag, not a check that it has passed. Published reads also use `useCdn: false` (`client.ts`), which removes the API CDN's own cache lag on top. Together they make it unlikely that the refetch after `revalidateTag` caches the old version until the next publish. The costs: every webhook call takes 3 seconds, a lag longer than that still caches stale content, and every cache miss reads the live API. Sanity meters live API requests separately from API CDN requests, with a smaller included quota, so check your plan's API vs API CDN request limits. The Next cache is per region or instance depending on the host, so each publish costs one live API read per page per region or instance, not just reads on cold paths.

The webhook is the only thing that refreshes published content. Without it, a cache entry lives until its 30-day `revalidate` runs out. The webhook calls only the URL it names, so preview deployments never receive it: their cached Sanity content refreshes only on that 30-day `revalidate`. See [ARCHITECTURE.md](../../../ARCHITECTURE.md) for the diagram.

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
