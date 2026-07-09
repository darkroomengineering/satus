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

- `post-checkout` lefthook hook that clears `.next/types` + `.next/dev/types` on branch switches (git flag `1` only — file checkouts untouched, rebases skipped), killing the ghost `tsc` errors caused by the previous branch's generated route types. Types regenerate on the next dev/build.
- Minimal Playwright E2E harness (`e2e/home.e2e.ts`) — smoke spec covering page render, zero console errors, and zero critical/serious a11y violations (via `@axe-core/playwright`). Run with `bun run test:e2e`. Specs use `.e2e.ts` extension so `bun test` ignores them. (#e2e)
- `bun run satus` plugin CLI — `satus list` shows every integration's installed status, and `satus add <plugin>` restores a stripped integration into a living project: files are copied from the public satus repo (the registry), dependencies re-pinned, and shared files re-wired through idempotent AST operations, so adding twice is a no-op. `setup:project` records the git HEAD sha as `"satus": { "ref": … }` in package.json and `satus add` fetches that pinned ref by default (`--from` uses a local checkout, `--ref` overrides). Both CLIs run non-interactively (`--preset`/`--keep`/`--yes`/`--skip-install`), verified by a network-free round-trip e2e (`lib/scripts/satus.e2e.test.ts`). (#185)
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

### Fixed

- Adversarial audit remediation (see `docs/audits/codebase-audit-2026-07-08.md`; findings cited by ID). Shopify: the Storefront endpoint now normalizes the store domain to `https://` (H1 — following the documented scheme-less `SHOPIFY_STORE_DOMAIN` previously made every API call throw on URL parse), webhook revalidation is actually wired into `app/api/revalidate` with a strippable dispatch (H2), and every `shopifyFetch` call site validates its payload with Zod schemas at the boundary (M2) — which surfaced and fixed four interface mis-models against the Storefront API (nullable `Image.width/height`, nullable `SEO` fields, nullable `Page.seo`, nullable `CartCost.totalTaxAmount`). CLI: `satus add --force` now actually reinstalls (H6); `setup:project` validates every bundle path upfront and self-prunes last, so a mid-run failure can't strand a fork in an unrecoverable half-stripped state (H8); `bun install` failures at the end of setup are non-fatal with clear guidance (M5); AST-transform failures now fail the run loudly instead of exiting 0 (M6); both CLIs guard against running outside the project root (L3) and warn on duplicate flags (L4). Handoff describes what ships on disk, not what's configured in the current shell — installed-but-unconfigured integrations are reported as needing configuration instead of silently omitted from `.env.example`/INVENTORY/DEPLOYMENT-CHECKLIST (H7). Components: `<Image>` requires one of `fill`/`width`+`height`/`aspectRatio` at the type level instead of silently rendering a broken 1×1 (H9); forms seed optional fields as valid and gate Enter-key submission on the same validity the button uses (H10 — an untouched optional field could previously block click-submit forever); the Link component is the single source of truth for external-link detection, with a `newTab` intent prop (L6); marquee cleans up detached nodes (L7) and `usePrefetch` no longer recreates its observer on inline options (L8). WebGL: theatre is live — `SheetProvider` self-bootstraps the project so sheets and the ⌘O Studio actually bind (H11); `WebGLImage` no longer decodes the document URL before `src` resolves and clears stale texture references on src change (M16, M14); `simTypes` is plumbed through the root canvas so pages can skip unused GPU sims (M17); module-scope tempus/storage listeners are HMR-idempotent (M18, L12); mounting two root canvases warns in dev (M19); the fluid splat queue is capped (L11). HubSpot forms validate Turnstile like their Mailchimp siblings (M3). CI/docs: Dependabot auto-merge gates on the CI workflow that actually exists and on the PR author instead of the run actor — the lockfile-sync commit makes the CI actor a PAT identity, which the old actor gate treated as "not Dependabot", permanently skipping exactly the PRs the automation exists for (H3); Playwright e2e runs in CI (M11); `bun run check` includes `manifest:check` (M8); all bun setups pin via `packageManager` (L1); and the documented-but-nonexistent surfaces are gone from the docs — `/studio` route and dead Sanity env vars (H5), `bun build` (M7), WebGPU/TSL renderer claims (M15), removed `measure`/`batch` raf exports (L9), wrong `useDeviceDetection` keys (L10), and the unreachable `SOURCE_MAPS` flag (L2).

### Changed

- TypeScript 7: the typecheck gate runs on the stable native (Go) compiler — `typescript@^7.0.2` installed under the `typescript7` npm alias, invoked by path (`bun node_modules/typescript7/bin/tsc --noEmit`) from `check`, `typecheck`, `typecheck:watch`, and the lefthook pre-commit hook. The classic `typescript@^6` package keeps the `typescript` name because Next 16.2's build-time type checking and dev server require the classic JS compiler API, which the TS7 native package does not ship — when Next supports TS7 directly, the alias flips to owning the name. The preview-era machinery is gone: the `@typescript/native-preview` (`tsgo`) dependency, the `typecheck:tsc`/`typecheck:compare` cross-check scripts, and the obsolete `typescript.experimental.useTsgo` VS Code flag. Operational wins from the native compiler: the pre-commit typecheck drops `--incremental false` (the TS7 alias is the sole `.tsbuildinfo` writer, so the ~4x-faster warm cache is safe) and `typecheck:watch` uses TS7's rebuilt native file watcher.
- Whole-codebase maintainability pass (net −1.2k lines): removed a dead Zustand WebGL-tunnel store; deduped the Shopify integration install path through `installBundle` and the fluid/flowmap pointer handling through a shared `usePointerInput`; split the 1k-line `ast-transforms.ts` into focused `helpers`/`remove-ops`/`add-ops`/`index` modules (behind a barrel re-export) and trimmed `setup-project.ts` under 1k; made bundle-key typing honest (`BundleId` + a `getBundle` accessor for the wider `RemovableId` space) and removed dishonestly-optional types (`CartLineItem.id`, `CartMeta`, a discriminated `CanvasContextValue`); and routed server-side integration env reads through the typed `@/lib/env` accessor. No consumer-facing API change.
- Dependencies: bumped every package to its latest version. The only breaking change was `tempus` dev.18, whose `TempusCallback` moved from positional `(time, deltaTime)` arguments to a single `TempusState` object (`{ time, deltaTime, frame, budget }`) and deprecated the `priority` option in favor of `order` — migrated all seven call sites (the GSAP, Lenis, marquee, and WebGL RAF runtimes, the `lib/utils/raf` write queue, and the dev `Stats` overlay). Also bumped `@base-ui/react` 1.6, `next-sanity` 13.1, `@types/node` 26, `deslop-cli` 0.5.8, `@biomejs/biome` 2.5.1, Storybook 10.4.6, Tailwind 4.3.1, and `@typescript/native-preview`; `actions/checkout` 6 → 7 in CI. Supersedes #251–254. (#255)
- Dependencies: bumped the Sanity toolchain to v6 (`sanity`, `@sanity/vision`, `groq` → `^6.1.0`) — Studio v6's breaking changes (Node 20 dropped, `auth.providers` replace semantics, `enableLegacySearch` removed) don't touch the integration's API surface, so forks on Node ≥ 22 update without code changes. Also bumped `@biomejs/biome` 2.5.0, `deslop-cli` 0.0.25, and `@typescript/native-preview`. Biome 2.5's newly-enabled rules required a `<title>` on `darkroom.svg` (`noSvgWithoutTitle`) and an import-spacing fix in generated `sanity.types.ts` (`organizeImports`); the inline version `<Script>` carries a documented `useInlineScriptId` ignore (the `id` is present — biome mis-detects JSX-children content). Supersedes #221–226. (#228)
- Integration registry is single-source: `INTEGRATION_BUNDLES` keys are typed against `RemovableId` from `lib/integrations/registry`, `prepare-handoff` matches integrations by id, and `next.config.ts` cleanup runs through typed ts-morph AST ops — the regex `updateNextConfig` is deleted.
- Removing the theatre integration now also strips the Theatre.js debug wiring from the webgl fluid/flowmap hooks (via a new `removeCallStatement` AST op), so keeping webgl without theatre builds cleanly.
- WebGL: forward-ported the newer module — typed `Fluid`/`Flowmap` simulations, the `image`, `postprocessing`, and `flowmap-provider` components, and a `canvas/webgl` renderer; tunnels use the `tunnel-rat` package. The scene lives in a single root canvas (`<Canvas root>`) mounted via one of two mutually-exclusive strategies: shared in the layout (`lib/features`, persists across routes) or per page via `<Wrapper webgl>`. A non-root `<Canvas>` mounts nothing and falls back to the root canvas. Removed the dead `global-canvas`, `gpu-detection`, `create-renderer`, and `canvas-context` modules; device-detection probes (Safari/WebGL/autoplay) are cached at module level. (#227)
- Integrations: Shopify customer actions run through `runFormAction`; Turnstile validation extracted to `lib/integrations/turnstile` (shared across integrations); the cart reconciler uses a discriminated union and every cart action returns one `CartActionResult` shape; optimistic add wraps in `startTransition`; the Mailchimp error path validates with Zod.
- App: `error.tsx` and `global-error.tsx` render a shared `ErrorView`; `APP_BASE_URL` is exported once from `lib/env`; `fb:app_id` reads from validated env; `next.config.ts` exports its config directly; dead nav scroll-lock and its orphaned store removed.
- components/ui: form registration is name-based instead of index-based; `real-viewport` slimmed to setting only `--scrollbar-width`; Base UI triggers use render props; `fetchJSON` responses are schema-validated; conditional `className` spreads replaced with `cn()`.
- Styles: easings and colors are each defined once — `css/easings.css` is a hand-authored `@theme` partial outside the generator — and the `nesting-rules` no-op was dropped from the PostCSS chain.
- Dependencies and lib/utils: removed `cross-env` (the `analyze` script sets `ANALYZE=true` inline); `@theatre/core` moved to `dependencies` (imported by `lib/webgl/utils/fluid` and `flowmaps`); bumped `groq` and `next-sanity`; deleted the unused `lib/utils` modules `context`, `animation`, `viewport`, and `easings`, with docs updated to match. (`tunnel-rat` and `postprocessing` are dependencies again — see the WebGL forward-port above.)
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
- Shopify cart actions (`removeItem`/`addItem`/`updateItemQuantity`) share a
  `runCartAction` helper for the IP + standard rate-limit prelude instead of
  inlining it three times; behavior is unchanged.
- `ast-transforms` op handlers route the ts-morph
  create/getFullText/removeSourceFile lifecycle through one `withSourceFile`
  helper with guaranteed cleanup — behavior-preserving, ~60 fewer lines.
- Barrel-file (`index.ts` re-export) manipulation is unified into one
  `lib/scripts/barrel-file.ts` (`findBarrelLine` / `removeBarrelLines` /
  `insertBarrelLine`); `setup-project`, `bundle-installer`, and
  `generate-component` share it instead of three divergent implementations.
- components/ui: `Form`/`FormProvider` collapsed into a single `Form`;
  `Checkbox` and `Switch` share an extracted control subtree across their
  label / no-label branches; dead `foldRef` dropped from `Fold`.
- WebGL `Program` drops vestigial `Scene` inheritance (reintroduced by the
  #227 forward-port) for the composition shape #199 had already established.

### Removed

- The in-app `/components` showcase, the `app/(examples)/` example routes (R3F, Sanity, Shopify, HubSpot), and the `app/studio/` route — component demos moved to Storybook and integration usage distilled into `// USAGE` comments in `lib/integrations/*`. Only the demo surface is gone; the reusable integration code stays. (#210)
- Unused `groq` dependency — `next-sanity`'s `defineQuery` covers GROQ and
  nothing imported the standalone package (it remains available transitively).
- Unused `components/ui/scroll-restoration` component (zero consumers).

### Fixed

- Correctness fixes from a whole-codebase review: `shopifyFetch` can now validate response payloads (opt-in `dataSchema`), not just the GraphQL envelope — and the Shopify README no longer overstates that responses are validated at the boundary; `AddToCart` sets `disabled` when no variant is selected (so it can't fire a no-op server action); the HubSpot form parser keeps every field in a multi-field group instead of silently dropping all but the first; and the WebGL fluid simulation is frame-rate independent — the frame delta is threaded into the step, so it no longer runs ~2× fast on 120 Hz displays.
- `cacheTag()` crash on `/sanity` and `/sanity/[slug]` under Cache Components — `sanityFetch` calls `cacheTag()`, which must run inside a `'use cache'` function. (#208)
- `use-webgl-element` attached two `IntersectionObserver`s on mount; now one. (#205)
- Accordion drove `Collapsible.Root` with a duplicate controller, and the custom scrollbar overshot when dragged on long pages. (#205)
- React Scan dev panel was hijacked by Lenis smooth scroll; added it to Lenis's `prevent` list. (#207)
- Turnstile dev-mode bypass collapsed to a single path. (#205)
- Shopify cart `addItem` now validates input before creating a cart, so invalid
  requests no longer leave an orphaned cart and cookie behind (#173).
- `TextareaField` renders through `Field.Control`, restoring the
  `aria-invalid` / `aria-describedby` / error-id wiring `InputField` already had.
- Shopify `removeItem` validates `merchandiseId` before the rate-limit prelude,
  so empty ids no longer consume a rate-limit slot.

### Security

- Hardened HubSpot form HTML stripping into a complete `stripHtmlTags` parser
  (a character scan, not regex), resolving the CodeQL
  `js/incomplete-multi-character-sanitization` alert (#179, #180).
- Turnstile siteverify responses are validated with a Zod schema and fail
  closed — an unexpected response shape now returns a failed verification
  instead of reading an unchecked `as`-cast `success`.

### Removed

- Dead and duplicate internal surface: unused `batch`/`measure` exports from
  `lib/utils/raf.ts` (only `mutate` is consumed), the duplicated
  `ShaderMaterial<K>`/`DoubleRenderTarget` webgl types (hoisted once into
  `lib/webgl/utils`), and the flat `Select*`/`Menu*`/`Tabs*` part exports that
  had zero importers (the compound `Select`/`Menu`/`Tabs` APIs are unchanged).
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
