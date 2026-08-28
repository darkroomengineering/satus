# lib/seo — AI SEO (AEO)

This module holds everything that makes the site legible to answer engines
(ChatGPT, Claude, Perplexity, Google AI Overviews), not just search crawlers.
Touch it when you change entity facts, add a route that should be
crawlable/citable, or change how a page negotiates HTML vs. Markdown.

**Files:**

- `site.ts` — canonical entity facts (`SITE`, `BASE_URL`). Single source of
  truth for JSON-LD, on-page prose, and `/llms.txt`.
- `schemas.ts` — typed schema.org JSON-LD node builders (Organization,
  WebSite, etc).
- `json-ld.tsx` — renders a JSON-LD `<script>` tag from a schema.
- `route-catalog.ts` — `STATIC_ROUTES`: starter-owned pages with no CMS
  backing (label, description, sitemap metadata).
- `routes.ts` — `ContentRoute` type and CMS-backed route lookup
  (`getCmsRoutes`), re-exports `STATIC_ROUTES`. Shared by the sitemap,
  `/llms.txt`, and the `/ai` machine view so none of them can disagree about
  which URLs exist.
- `agent-content.ts` — Markdown builders (`buildStaticRoutesMarkdown`,
  `buildCmsRoutesMarkdown`, `buildAgentGuidanceMarkdown`,
  `buildDeveloperResourcesMarkdown`) used by `/llms.txt` and the `.md`
  content-negotiation mirrors.
- `markdown-path.ts` — path helpers (`markdownPathForRoute`,
  `routePathFromMarkdown`) and the `/agent-content` handler path constant.
- `markdown-document.ts` — builds the `MarkdownDocument` result (200/404/406,
  or a redirect) for a page's Markdown representation.
- `content-negotiation.ts` — `Accept`-header negotiation between
  `text/html` and `text/markdown`, plus the one-shot HTML override param
  used to break a negotiation loop.
- `alternates.ts` — builds the `alternates` metadata block for a route so
  every page keeps its `text/plain` link to `/llms.txt`.

**Routes that consume this module:**

- `app/llms.txt/route.ts` — generates `/llms.txt` from `SITE` and
  `getCmsRoutes()`.
- `app/(site)/ai/{layout,page}.tsx` — the `/ai` machine view: a plain-HTML
  page under its own chrome-free layout that lists every route.
- `app/agent-content/route.ts` — serves the Markdown mirror for a page when
  content negotiation picks `text/markdown`.
- `proxy.ts` — runs `negotiateDocumentType` (from `content-negotiation.ts`)
  and `routePathFromMarkdown` (from `markdown-path.ts`) to decide whether a
  request gets HTML, a Markdown redirect, or a 406.
- `app/sitemap.ts` and `app/robots.ts` — read `STATIC_ROUTES` / `BASE_URL` so
  the sitemap and the AI-bot allowlist stay in sync with the route catalog.

## Policy

- **Entity facts live in one file.** `lib/seo/site.ts`. JSON-LD, on-page prose, and `/llms.txt` all read from it, so they cannot disagree. Answer engines cross-check.
- **Organization + WebSite JSON-LD render from the app layout** (`app/(site)/layout.tsx`), never from the homepage. Answer-engine traffic lands on deep pages; an entity that only exists on `/` is invisible to it.
- **Never emit a JSON-LD key you cannot fill.** `"description": null` is worse than an absent key. Conditional-spread every optional field.
- **Entity prose must be in the initial HTML and actually visible.** A visually quiet section is fine; `sr-only` or `display: none` reads as cloaking and gets discounted. If a page is visual-first (canvas, galleries), it needs a plain-prose block or crawlers have nothing to cite.
- **`Suspense fallback={null}` ships HTML with zero links.** Any client subtree that bails out of prerendering — `useSearchParams`, `cookies()`, `headers()` — leaves its fallback in the static HTML. If that fallback is `null`, crawlers see an empty page and the linked routes lose their only internal link. Server-render a static mirror of the list as the fallback; hydration swaps in the interactive version.
- **Never redirect on user-agent without exempting bots.** Googlebot Smartphone, site auditors, and AI crawlers send mobile UAs. A mobile redirect turns every sitemap entry into a 3XX. Gate the redirect behind a bot check (`isbot`) if you add one.
- **`metadataBase` must be set** or OG/Twitter image paths stay relative and fail to resolve for scrapers. It is set in `app/(site)/layout.tsx`.
- **Normalize CMS-authored hrefs** before rendering. Editors paste bare domains and mixed-case protocols; unnormalized values produce broken or duplicate-target links that leak crawl budget.
- **`/llms.txt`** is generated from `lib/seo/site.ts` at `app/llms.txt/route.ts`. Markdown mirrors of content routes (`/page.md`, with a `Link: <…>; rel="alternate"` header) are the next step for content-heavy sites — not shipped here because they need a CMS to be worth it.
- **Ship a `/ai` machine view.** One plain-HTML route (`app/(site)/ai/page.tsx`) that names the entity and links every page, under its own layout with no chrome, no canvas and no client components of its own. Visual-first pages give answer engines nothing to cite; this gives them everything in one fetch. Keep it in sync with `app/sitemap.ts` — a route missing from either is invisible. It still inherits the app providers from `app/(site)/layout.tsx`; moving it out of the `(site)` group would make it runtime-free (the root `app/layout.tsx` is already a bare shell).
- **Fetch CMS content with the published perspective for machine-readable routes.** Draft/preview perspectives embed stega encoding — invisible Unicode characters interleaved through every string for visual editing. They are invisible to humans and corrupt the text an LLM reads. Anything rendered into `/ai`, `/llms.txt`, or a `.md` mirror must come from a published-perspective fetch or be run through `stegaClean`.
- **Drive any human/machine view toggle from a server prop, not the pathname.** Reading `usePathname()` to decide which mode is active makes the first paint ambiguous and can flip after hydration. Pass `mode` down from the layout that already knows.
