# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning

Satus is a starter template, so semver is read from the perspective of a project
that forked it:

- **MAJOR**: changes that break a fork on update. Removing or renaming a core
  primitive (`Image`, `Link`, `Wrapper`), restructuring directories or path
  aliases, dropping a built-in integration, or a Node.js / Next.js major bump.
- **MINOR**: additive capabilities. New components, hooks, utilities, or
  integrations.
- **PATCH**: bug fixes, dependency bumps, docs, and internal refactors with no
  consumer-visible API change.

There are no long-term support branches. Forks track upstream by rebasing onto the
latest tag; security fixes land on the latest release (see `SECURITY.md`).

## [Unreleased]

### Added

- Storybook themed to match Satūs: stories render on the site palette through shared CSS tokens (edit the site, the catalogue follows), with a dark/light/red/evil theme toolbar and a branded manager. (#210)
- Optional `/storybook` route that proxies to a standalone Storybook deployment, enabled per-environment via `NEXT_PUBLIC_STORYBOOK_URL` and force-disabled in Production. (#210)
- One-click Deploy to Vercel button (README + in-app manual) and clearer domain-setup guidance. (#210)
- `parseApiResponse` (`lib/utils/validation.ts`) — validates external API responses with Zod at the integration boundary (HubSpot, Mailchimp, Shopify GraphQL envelope), so malformed responses fail clearly at the edge instead of crashing downstream. (#198)
- React Scan render profiler as an opt-in Orchestra dev tool — toggle 🔬 in the ⌘O palette, off by default (no profiler overhead unless enabled). (#209)
- `useReveal` hook (`lib/hooks/use-reveal.ts`) — reveal-on-scroll primitive animating `transform`/`opacity` on the compositor thread via a `[data-reveal]`/`[data-reveal-item]` CSS contract in `global.css`; degrades to visible without JS and honors reduced-motion. (#189)
- Animation standards section in AGENTS.md — CSS/`useReveal` for reveals, GSAP for orchestration. (#189)
- `AGENTS.md` as the single source of truth for engineering standards; `CLAUDE.md`
  and `.cursor/rules` reduced to thin pointers (#175).
- Auto-generated `COMPONENTS.md` manifest via `bun run generate:manifest`, with
  `bun run manifest:check` to catch drift in CI (#178).
- `SECURITY.md` security policy with private vulnerability reporting (#174).
- This `CHANGELOG.md`, and `package.json` version synced to the release tag.

### Changed

- Integration registry is single-source: `INTEGRATION_BUNDLES` keys are typed against `RemovableId` from `lib/integrations/registry`, `prepare-handoff` matches integrations by id, and `next.config.ts` cleanup runs through typed ts-morph AST ops — the regex `updateNextConfig` is deleted.
- Removing the theatre integration now also strips the Theatre.js debug wiring from the webgl fluid/flowmap hooks (via a new `removeCallStatement` AST op), so keeping webgl without theatre builds cleanly.
- WebGL: deleted the `flowmap-provider`, `image`, and `postprocessing` components; the tunnel utility is vendored as `lib/webgl/utils/tunnel.ts` (replacing the `tunnel-rat` package); renderer/context typing is honest (no `as` casts); `GlobalCanvas` is lazy-loaded by `lib/features` rather than re-exported as `LazyGlobalCanvas` from `global-canvas`.
- Integrations: Shopify customer actions run through `runFormAction`; Turnstile validation extracted to `lib/integrations/turnstile` (shared across integrations); the cart reconciler uses a discriminated union and every cart action returns one `CartActionResult` shape; optimistic add wraps in `startTransition`; the Mailchimp error path validates with Zod.
- App: `error.tsx` and `global-error.tsx` render a shared `ErrorView`; `APP_BASE_URL` is exported once from `lib/env`; `fb:app_id` reads from validated env; `next.config.ts` exports its config directly; dead nav scroll-lock and its orphaned store removed.
- components/ui: form registration is name-based instead of index-based; `real-viewport` slimmed to setting only `--scrollbar-width`; Base UI triggers use render props; `fetchJSON` responses are schema-validated; conditional `className` spreads replaced with `cn()`.
- Styles: easings and colors are each defined once — `css/easings.css` is a hand-authored `@theme` partial outside the generator — and the `nesting-rules` no-op was dropped from the PostCSS chain.
- Dependencies and lib/utils: removed `cross-env` (the `analyze` script sets `ANALYZE=true` inline), `tunnel-rat`, and `postprocessing`; `@theatre/core` moved to `dependencies` (imported by `lib/webgl/utils/fluid` and `flowmaps`); bumped `groq` and `next-sanity`; deleted the unused `lib/utils` modules `context`, `animation`, `viewport`, and `easings`, with docs updated to match.
- Fonts now load via `next/font/google` (Oswald for display, Spline Sans Mono for body) instead of self-hosted woff2 — no font binaries ship in the repo, and the brand type scale (sizes, line-heights, tracking from the Figma spec) is encoded in `lib/styles/typography.ts`. (#210)
- Components are now catalogued in Storybook (`bun storybook`) instead of an in-app `/components` page; added stories for accordion, alert-dialog, checkbox, link, marquee, menu, switch, and tabs. (#210)
- `app/page.tsx` is now a self-contained in-app manual (clone → ship); replace it with your homepage and delete `app/page.module.css` when you start a project. (#210)
- Integrations reframed as opt-in plugins isolated under `lib/integrations` with `// USAGE` notes — the precursor to the additive `satus add <plugin>` CLI proposed in #185. (#210)
- Shopify cart types: named the post-reshape line item (`CartLineItem`), made `Cart.id` required, and removed 11 `as` casts; `removeItem`/`updateItemQuantity` now take the client-held `lineId`, dropping a `getCart` round-trip per mutation. (#198)
- Mailchimp integration returns typed `MailchimpErrorCode` values instead of sniffing error strings; tag/note writes are best-effort. (#198)
- WebGL: removed the unused `local` canvas mode and `canvas/webgl.tsx`, dropped vestigial `Scene` inheritance from `Program`, and made the flowmap/fluid sims opt-in instead of booting on every WebGL page. (#199, #206)
- Sanity example pages wrap `sanityFetch` in a `'use cache'` function for Cache Components (`cacheComponents`) compatibility, which also dedupes the page and `generateMetadata` fetches. (#205, #208)
- Dev scripts deduped: one shared ts-morph `Project` in `ast-transforms`, reused `toPascalCase`/`cancelGuard`, and renamed the two divergent `updatePackageJson` helpers. (#198)
- `spring()` (`lib/utils/animation.ts`) documentation now steers to CSS `linear()` easing for off-thread springs. (#189)
- Dependabot PRs now auto-sync `bun.lock` via a `pull_request_target` workflow, so they pass the frozen-lockfile install in CI. (#190)
- Consolidated root docs: folded `BOUNDARIES.md` into `ARCHITECTURE.md` and
  refreshed the doc maps in `README.md` and `AGENTS.md` (#177).

### Removed

- The in-app `/components` showcase, the `app/(examples)/` example routes (R3F, Sanity, Shopify, HubSpot), and the `app/studio/` route — component demos moved to Storybook and integration usage distilled into `// USAGE` comments in `lib/integrations/*`. Only the demo surface is gone; the reusable integration code stays. (#210)

### Fixed

- `cacheTag()` crash on `/sanity` and `/sanity/[slug]` under Cache Components — `sanityFetch` calls `cacheTag()`, which must run inside a `'use cache'` function. (#208)
- `use-webgl-element` attached two `IntersectionObserver`s on mount; now one. (#205)
- Accordion drove `Collapsible.Root` with a duplicate controller, and the custom scrollbar overshot when dragged on long pages. (#205)
- React Scan dev panel was hijacked by Lenis smooth scroll; added it to Lenis's `prevent` list. (#207)
- Turnstile dev-mode bypass collapsed to a single path. (#205)
- Shopify cart `addItem` now validates input before creating a cart, so invalid
  requests no longer leave an orphaned cart and cookie behind (#173).

### Security

- Hardened HubSpot form HTML stripping into a complete `stripHtmlTags` parser
  (a character scan, not regex), resolving the CodeQL
  `js/incomplete-multi-character-sanitization` alert (#179, #180).

### Removed

- Hand-rolled `components/ui/dropdown/` — superseded by the accessible Base UI `Select`. (#202, #205)
- `lib/utils/animation.ts` re-exports of `clamp` / `lerp` / `mapRange` / `modulo` / `truncate` — import these from `@/utils/math` instead. (#198)
- In-repo marketing homepage — the `app/(marketing)` landing sections (hero, features, value-props, getting-started, presets) and marketing-only WebGL effects (`animated-gradient`, `liquid-drip`, `split-text`). Satus is a starter kit; its marketing lives at oss.darkroom.engineering/satus. (#188)
- `/home` rewrite + redirect and the `assets.darkroom.engineering` image `remotePattern` from `next.config.ts`. (#188)
- Dead code: orphaned WebGL GLSL utilities (`noise` / `blend` / `functions`) and
  unused `lib/utils` helpers (`normalize`, `isEmptyObject`, `twoDigits`,
  `numberWithCommas`) (#172).

## [2.0.1] - 2026-06-02

### Added

- Storybook 10 component sandbox (`@storybook/nextjs-vite` + MCP addon, wired for
  Tailwind v4) (#159).

### Changed

- Integration-removal transforms in `setup:project` rewritten from regex to
  ts-morph AST operations, resilient to formatting changes (#155).
- Client-handoff doc templates extracted from `prepare-handoff.ts` into editable
  template modules (#156).
- Dependency batch: `next` / `@next/bundle-analyzer` 16.2.7, `react` / `react-dom`
  19.2.7, `@types/react` 19.2.16, `ts-morph` 28, `@typescript/native-preview`
  snapshot (#171).
- `hamo` / `tempus` pinned to their current dev versions and excluded from
  Dependabot, since no stable v1 exists upstream (#157, #164).

## [2.0.0] - 2026-06-01

### Added

- New liquid-metal "drip" hero effect (TSL, screen-space, ~120 FPS).

### Changed

- WebGL layer migrated to TSL NodeMaterials on `WebGPURenderer`, with a WebGL2
  fallback for browsers without WebGPU (gradient, fluid sim, flowmap, R3F demo).
- Next.js 16 Cache Components fixes (`revalidateTag` cache profiles); next-sanity 13
  (`defineLive` / `defineQuery`).
- Shopify data layer split from a single 440-line module into focused files plus a
  shared `reshape.ts`.
- Base UI cleanup, server-rendered theme default (removed inline `<script>`), leaner
  `.env.example`, dependency bumps.

### Fixed

- Browsers without WebGPU now use the WebGL2 backend instead of the classic
  renderer, so TSL materials and animations work everywhere.

[Unreleased]: https://github.com/darkroomengineering/satus/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/darkroomengineering/satus/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/darkroomengineering/satus/releases/tag/v2.0.0
