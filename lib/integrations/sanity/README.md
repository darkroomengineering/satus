# Sanity CMS Integration

Headless CMS with visual editing. Published content is cached under one tag and refreshed by a signed publish webhook; drafts are read only in draft mode. There is no Sanity Live and no token in the browser. Flow diagram: [ARCHITECTURE.md § Caching](../../../ARCHITECTURE.md#caching).

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
- `isConfigured('sanity')` from the registry reports whether the Zod-validated config is complete.
- The [Vercel Marketplace Sanity integration](https://vercel.com/marketplace) provisions `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` and `SANITY_API_READ_TOKEN` under the same names, so it works with no config changes. It may also provision `SANITY_API_WRITE_TOKEN`; Satus ignores it, so delete it if nothing else of yours uses it.
- `SANITY_STUDIO_PROJECT_ID` (Sanity's own CLI/template convention, the name `sanity init` and the CLI's template validator expect) is accepted as a fallback for `NEXT_PUBLIC_SANITY_PROJECT_ID`.

## Studio

Run locally with `cd lib/integrations/sanity && bunx sanity dev`; deploy to Sanity's hosted domain (`https://<project>.sanity.studio`) with `bunx sanity deploy` from the same folder.

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

Read content through `sanityFetch({ query, params })` (`@/integrations/sanity/fetch`) straight from a Server Component or `generateMetadata`. It sets its own caching, so the call site needs nothing else.

- `sanityFetch` returns the query result, or `null` when Sanity isn't configured.
- Outside draft mode it calls `sanityFetchPublished` (`published.ts`): a fetch tagged `sanity` in Next's Data Cache, with a 30-day `revalidate` backstop, reading published content from the live API, not the API CDN (a stale CDN answer right after a publish would be cached until the next one). Outside draft mode the page and `generateMetadata` share its cache entry.
- In draft mode, with `SANITY_API_READ_TOKEN` set, it reads the perspective Presentation picks (drafts by default, or the content release an editor selects), with stega markers and no cache (the base client already skips the API CDN). Presentation stores the pick in the `sanity-preview-perspective` cookie, and `resolvePerspectiveFromCookies` from `next-sanity/live` reads it. A second `sanityFetch` in `generateMetadata` therefore reads Sanity again in draft mode.
- A route that renders per request from a URL slug checks `isKnownCmsPath` (`known-path.ts`) before its `sanityFetch`, as `app/(site)/[...slug]` and `app/(site)/articles/[slug]` do. Each published read is cached, a `null` miss included, so without the check every random slug writes a Data Cache entry. It compares the path with the sitemap's published route list (one cached read) and skips the check in draft mode, where unpublished drafts must still preview.
- `sanityFetchPublished` (`@/integrations/sanity/published`) reads published content only. Use it outside a page request, like the sitemap (`lib/seo/routes.ts`) or `generateStaticParams`, where draft mode can't be read.
- `generateSanityMetadata` (`@/lib/utils/metadata`) does not clean stega markers itself: pass it `stegaClean(data)`.

### Visual Editing

Mark editable elements with `data-sanity` attributes (`data-sanity={doc._id}` on the container, `data-sanity="title"` on fields). `RichText` (`@/integrations/sanity/components/rich-text`) renders rich text fields.

### Image Handling

```tsx
// urlForImage: @/integrations/sanity/utils/image · SanityImage: @/components/ui/sanity-image
<Image src={urlForImage(image).url()} alt={stegaClean(image.alt) ?? ''} width={800} height={600} />
<SanityImage image={image} maxWidth={800} /> // reads and cleans `image.alt` itself
```

Every image field carries an editor-written `alt`, defined once as `altField` in `schemas/fields.ts`; add it to a new image field's `fields`. It's optional, and an empty one renders `alt=""`, which marks the image as decorative. Rich text images override it to required. Project `alt` in the query (a bare `image` or `...` projection already includes it). Run it through `stegaClean` before it reaches the DOM: in draft mode every Sanity string carries hidden edit markers. Import it from `next-sanity`, as the rest of the repo does. Two of these alt fields reach no page yet: no query reads the navigation document, so `socials[].logo` never renders, and `metadata.image` isn't dereferenced into the Open Graph tags (see `generateSanityMetadata`). Wire them through `SanityImage` when a fork renders either.

`Image` gives any `cdn.sanity.io` URL a loader (`components/ui/image/sanity-loader.ts`): Sanity's CDN resizes each `srcset` width itself, as WebP, and Next's optimizer never sees the image (`cdn.sanity.io` is not in `images.remotePatterns`). The loader sets `w` per candidate, so a width on the URL is overwritten; a `rect` crop is kept. `SanityImage` also takes the aspect ratio from the editor's crop and keeps their hotspot in view under `object-cover`.

The WebGL `Image` (`@/webgl/components/image`) loads its texture from the same `cdn.sanity.io` URL with a CORS request, and Sanity's CDN answers an origin missing from the project's CORS list with a 403. Add every origin the site is served from to the project's CORS origins (manage.sanity.io > API > CORS origins), including a wildcard for preview deploys (`https://*.vercel.app`) and `http://localhost:3000`. No credentials are needed. A refused origin falls back to the plain DOM image, so the only symptom is a missing WebGL effect.

A raw `<img>` is not an option here: oxlint's `nextjs/no-img-element` rule rejects it project-wide.

### Links

Every link is the `link` type from [sanity-plugin-link-field](https://www.sanity.io/plugins/sanity-plugin-link-field), registered with `linkField()` in `sanity.config.ts`. Editors pick a page or article, a URL, an email address or a phone number, plus an optional "open in new window", URL parameters and anchor. There is no `link` schema in `schemas/`.

- **Schema.** Add a link with `linkField(name, { title, description, required, enableText })` from `schemas/fields.ts`. `required` uses the plugin's `requiredLinkField`, because `Rule.required()` passes an empty link object. In rich text, the `link` annotation is the same type.
- **Linkable types.** `linkableSchemaTypes` lists the document types an internal link can point to. A new routable type goes there and gets a case in `resolveDocumentUrl` (`utils/link.ts`), or links to it resolve to `#`. `enabledBuiltInLinkTypes` turns on internal, external, email and phone; each has a branch in `urlForReference`, and a type you enable later needs one too.
- **Query.** Dereference the internal link wherever a query returns a link, `link{..., internalLink->{_type, slug}}`; in rich text, inside `markDefs` (see `queries.ts`). Without it the resolver has no slug and returns `#`.
- **Render.** Spread `getLinkAttributes(link)` onto `Link` from `@/components/ui/link`, not the plugin's own `Link` from `sanity-plugin-link-field/component`. The resolver runs `stegaClean` itself, re-checks external URLs against an http, https, mailto and tel allowlist (the Studio's own check is advisory), and returns `#` for an empty link. New tab is tri-state: "open in new window" wins when an editor set it either way; left unset, absolute http(s) URLs open in a new tab and everything else stays in the tab.

A link saved with `linkType`, `externalUrl` and `openInNewTab` instead of `type`, `url` and `blank` is not one the plugin reads: it renders as `#`, with no error, and a page's required `link` in that shape fails validation ("Link is required"), so the page can't be published until the link is re-picked in the Studio. The CHANGELOG entry for the link plugin has the field mapping for moving them in bulk and a GROQ query that lists the documents still holding one.

## Creating New Content Types

Define the type in `schemas/`, add it to `schemas/index.ts`, write its query in `queries.ts`, add the page under `app/`, then run `bun run sanity:extract && bun run sanity:typegen` (see [Types](#types)).

## Revalidation

Create the webhook in [sanity.io/manage](https://sanity.io/manage) → your project → API → Webhooks: URL `https://your-domain.com/api/revalidate`, method POST, trigger on create, update and delete, and a secret. Set the same secret as `SANITY_REVALIDATE_SECRET`.

`app/api/revalidate/route.ts` dispatches requests carrying a `sanity-webhook-signature` header to `revalidate()` in `revalidate.ts`, which verifies the signature with `parseBody` from `next-sanity/webhook`, then calls `revalidateTag('sanity', { expire: 0 })`. One tag covers every page, because a per-type tag would miss a page that shows a referenced document of another type. `expire: 0` means the next visit renders fresh content instead of one more stale page.

`parseBody`'s third argument (`true`, named `waitForContentLakeEventualConsistency` in next-sanity) sleeps a fixed 3 seconds after a valid signature. Content Lake is eventually consistent, so a query sent the moment the webhook fires can still get the old version; the sleep is a hedge against that replication lag, not a check that it has passed. Published reads also use `useCdn: false` (`client.ts`), which removes the API CDN's own cache lag on top. Together they make it unlikely that the refetch after `revalidateTag` caches the old version until the next publish. The costs: every webhook call takes 3 seconds, a lag longer than that still caches stale content, and every cache miss reads the live API. Sanity meters live API requests separately from API CDN requests, with a smaller included quota, so check your plan's API vs API CDN request limits. The Next cache is per region or instance depending on the host, so each publish costs one live API read per page per region or instance, not just reads on cold paths.

The webhook is the only thing that refreshes published content. Without it, a cache entry lives until its 30-day `revalidate` runs out. The webhook calls only the URL it names, so preview deployments never receive it: their cached Sanity content refreshes only on that 30-day `revalidate`.

## Draft mode

Presentation enables draft mode through `/api/draft-mode/enable` (`defineEnableDraftMode`, using the Viewer token to validate its preview secret). `app/(site)/layout.tsx` then renders `SanityVisualEditing` (`components/visual-editing.tsx`), which draws the click-to-edit overlays and calls `router.refresh()` when an editor changes a field, so the preview follows typing without Sanity Live. `DisableDraftMode` (`components/disable-draft-mode.tsx`, wired into the `/sanity` example layout) shows a "Disable Draft Mode" link outside the Studio frame: a plain `<a>`, because prefetching `/api/draft-mode/disable` would turn draft mode off.

## Types

After changing a schema or a query, run `bun run sanity:extract` then `bun run sanity:typegen`. Typegen reads the `typegen` key in `sanity.cli.ts` (the separate `sanity-typegen.json` is deprecated by the Sanity CLI).

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

## Deploying the Studio

`sanity` sits in `devDependencies` even though `/studio` is part of the shipped app. That works on any host: Next compiles the Studio into the server chunk during `next build`, so nothing resolves `sanity` from `node_modules` at request time. Pruning dev dependencies after a successful build is safe, and no `serverExternalPackages` entry is needed. It must be installed when `next build` runs: a pipeline that installs production-only dependencies _before_ building fails, as it would for Tailwind or TypeScript.

## Troubleshooting

- **Visual editor not loading**: check the env vars and that `/api/draft-mode/enable` exists.
- **Content not updating**: check the webhook exists, points at `/api/revalidate`, and its secret matches `SANITY_REVALIDATE_SECRET` (the webhook's attempt log in sanity.io/manage shows a `401` for a wrong secret and a `503` for an unset one).
- **Draft mode not refreshing while typing**: check `SANITY_API_READ_TOKEN` is set and the page renders inside `app/(site)/layout.tsx`.
