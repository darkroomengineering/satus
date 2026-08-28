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

## [3.0.0] - 2026-08-28

### Changed

#### Toolchain and CI

- Node.js floor raised to 24.20.0 (current LTS) in `package.json` engines, `.nvmrc`, and `.node-version`; CI resolves the same version through `actions/setup-node`. Forks on Node 22 must upgrade before updating. Under the versioning policy above this is a MAJOR change.
- Linting and formatting moved from Biome to the Oxc toolchain: `oxlint` for linting, `oxfmt` for formatting. Nothing changes about how you work — `bun run check`, `bun lint`, `bun lint:fix` and `bun run format` keep their names and meanings, there is still one pre-commit hook and one editor extension (`oxc.oxc-vscode`), and house style is untouched (80 columns, 2-space indent, single quotes, semicolons only where required). Three things do change. Unsorted Tailwind classes and unsorted imports are no longer lint errors — `oxfmt` sorts both when you format or save, so they fix themselves. Formatting now covers Markdown, YAML and TOML too, which Biome never touched. And a new `bun run lint:types` uses the TypeScript 7 install to catch un-awaited promises and async handlers passed where a void return is expected; it runs in `bun run check` and CI but stays out of the pre-commit hook so commits stay fast. It found 18 floating promises on the first run, all now marked explicitly. `biome.json` and the three GritQL plugins in `.biome/` are gone, replaced by built-in oxlint rules.
- TypeScript 7: the typecheck gate runs on the stable native (Go) compiler — a single `typescript@^7.0.2`, invoked by path (`bun node_modules/typescript/bin/tsc --noEmit`) from `check`, `typecheck`, `typecheck:watch`, and the lefthook pre-commit hook. The dual-package setup (classic `typescript@^6` for Next's JS API plus a `typescript7` npm alias for the actual gate) is gone: Next 16.3 defaults `useTypeScriptCli` to `true`, so it shells out to the TS CLI itself instead of requiring the classic JS compiler API that TS7 native never shipped. The preview-era machinery is gone too: the `@typescript/native-preview` (`tsgo`) dependency, the `typecheck:tsc`/`typecheck:compare` cross-check scripts, and the obsolete `typescript.experimental.useTsgo` VS Code flag. Operational wins from the native compiler: the pre-commit typecheck drops `--incremental false` (typescript is the sole `.tsbuildinfo` writer, so the ~4x-faster warm cache is safe) and `typecheck:watch` uses TS7's rebuilt native file watcher.
- Whole-codebase maintainability pass (net −1.2k lines): removed a dead Zustand WebGL-tunnel store; deduped the Shopify integration install path through `installBundle` and the fluid/flowmap pointer handling through a shared `usePointerInput`; split the 1k-line `ast-transforms.ts` into focused `helpers`/`remove-ops`/`add-ops`/`index` modules (behind a barrel re-export) and trimmed `setup-project.ts` under 1k; made bundle-key typing honest (`BundleId` + a `getBundle` accessor for the wider `RemovableId` space) and removed dishonestly-optional types (`CartLineItem.id`, `CartMeta`, a discriminated `CanvasContextValue`); and routed server-side integration env reads through the typed `@/lib/env` accessor. No consumer-facing API change.
- Dev scripts deduped: one shared ts-morph `Project` in `ast-transforms`, reused `toPascalCase`/`cancelGuard`, and renamed the two divergent `updatePackageJson` helpers. (#198)
- Dependabot PRs now auto-sync `bun.lock` via a `pull_request_target` workflow, so they pass the frozen-lockfile install in CI. (#190)
- `ast-transforms` op handlers route the ts-morph
  create/getFullText/removeSourceFile lifecycle through one `withSourceFile`
  helper with guaranteed cleanup — behavior-preserving, ~60 fewer lines.
- Barrel-file (`index.ts` re-export) manipulation is unified into one
  `lib/scripts/barrel-file.ts` (`findBarrelLine` / `removeBarrelLines` /
  `insertBarrelLine`); `setup-project`, `bundle-installer`, and
  `generate-component` share it instead of three divergent implementations.

#### Next.js and caching

- Next.js 16.3: bumped `next` and `@next/bundle-analyzer` to `16.3.0` and made instant navigations the starter default — top-level `partialPrefetching: true` (shell-based prefetching: one reusable loading shell per route, cached client-side and shared by every link pointing at it; supersedes `experimental.prefetchInlining`) plus `experimental.cachedNavigations: true`, the one piece of the instant-nav cluster still opt-in in stable (`varyParams`, `optimisticRouting`, and the Turbopack build FS cache are default-on in 16.3, so no flags for those). Replaced the placeholder `app/(site)/loading.tsx` with an accessible skeleton shell (`<output>` status semantics, `aria-busy`, `sr-only` label, `animate-pulse` bars) so prefetched navigations land on something meaningful, and enabled `experimental.turbopackRustReactCompiler` (native React Compiler inside Turbopack, pairs with `reactCompiler: true`). Added `bun run bench:nav`, a client-side navigation benchmark — Lighthouse only audits cold loads, which never navigate — shipping with a 404→home scenario that runs on any build; the measured trade for `partialPrefetching` is in #259: shell paint gets faster and far more predictable, while a dynamic route's streamed content starts later because shell and data serialise. (#259)
- Sanity example pages wrap `sanityFetch` in a `'use cache'` function for Cache Components (`cacheComponents`) compatibility, which also dedupes the page and `generateMetadata` fetches. (#205, #208)

#### Security

- Content-Security-Policy is now enforced instead of Report-Only, and composed from the integration registry instead of hand-maintained: each kept integration in `lib/integrations/registry.ts` declares the origins its browser-visible code actually needs (`cspSources`), and `lib/integrations/csp.ts` unions them into the single `Content-Security-Policy` header at `next.config.ts` config-eval time — strip an integration with `setup:project` and its origins drop out on the next build, no manual edit required. The previous Report-Only baseline allowed `https:`/`wss:` everywhere and blocked nothing; the new policy is scoped to real origins (Sanity, Shopify, HubSpot's form embed) and enforced. `script-src`/`style-src` still need `'unsafe-inline'` — there's no nonce pipeline yet — so an injected `<script>` tag isn't blocked by this policy, but `connect-src`/`img-src`/`frame-ancestors` now have real teeth. `frame-ancestors` is unchanged. A `PROJECT_CSP_EXTRA_SOURCES` escape hatch in `lib/integrations/csp.ts` covers project-specific origins the registry can't know about. (#318)

#### WebGL and animation

- WebGL tunnels are first-party: the `tunnel-rat` dependency (stale since 2023, pinned to zustand 4) is replaced by `lib/webgl/utils/tunnel.ts`, a typed port of its ~60-line factory on the zustand 5 already in the manifest. Same `In`/`Out` semantics, one less dependency, and no second zustand copy pulled in by our own code (drei still carries it transitively). The original implementation's MIT notice is preserved in `THIRD-PARTY-NOTICES.md`.
- WebGL: forward-ported the newer module — typed `Fluid`/`Flowmap` simulations, the `image`, `postprocessing`, and `flowmap-provider` components, and a `canvas/webgl` renderer; tunnels use the first-party `tunnel()` factory in `lib/webgl/utils/tunnel`. The scene lives in a single root canvas (`<Canvas root>`) mounted via one of two mutually-exclusive strategies: shared in the layout (`lib/features`, persists across routes) or per page via `<Wrapper webgl>`. A non-root `<Canvas>` mounts nothing and falls back to the root canvas. Removed the dead `global-canvas`, `gpu-detection`, `create-renderer`, and `canvas-context` modules; device-detection probes (Safari/WebGL/autoplay) are cached at module level. (#227)
- WebGL: removed the unused `local` canvas mode and `canvas/webgl.tsx`, dropped vestigial `Scene` inheritance from `Program`, and made the flowmap/fluid sims opt-in instead of booting on every WebGL page. (#199, #206)
- `spring()` (`lib/utils/animation.ts`) documentation now steers to CSS `linear()` easing for off-thread springs. (#189)
- WebGL `Program` drops vestigial `Scene` inheritance (reintroduced by the
  #227 forward-port) for the composition shape #199 had already established.

#### Integrations

- API route handlers now return the team-convention `{ data, error }` shape: `error` is `null` on success and a message string on failure, `data` is the payload or `null`. `POST /api/cart/ensure` and `POST /api/revalidate` (both the Sanity and Shopify branches) are affected; every status code is unchanged. Clients that only checked `response.ok` keep working.
- Integration registry is single-source: `INTEGRATION_BUNDLES` keys are typed against `RemovableId` from `lib/integrations/registry`, `prepare-handoff` matches integrations by id, and `next.config.ts` cleanup runs through typed ts-morph AST ops — the regex `updateNextConfig` is deleted.
- Removing the theatre integration now also strips the Theatre.js debug wiring from the webgl fluid/flowmap hooks (via a new `removeCallStatement` AST op), so keeping webgl without theatre builds cleanly.
- Integrations: Shopify customer actions run through `runFormAction`; Turnstile validation extracted to `lib/integrations/turnstile` (shared across integrations); the cart reconciler uses a discriminated union and every cart action returns one `CartActionResult` shape; optimistic add wraps in `startTransition`; the Mailchimp error path validates with Zod.
- Integrations reframed as opt-in plugins isolated under `lib/integrations` with `// USAGE` notes. (#210)
- Shopify cart types: named the post-reshape line item (`CartLineItem`), made `Cart.id` required, and removed 11 `as` casts; `removeItem`/`updateItemQuantity` now take the client-held `lineId`, dropping a `getCart` round-trip per mutation. (#198)
- Mailchimp integration returns typed `MailchimpErrorCode` values instead of sniffing error strings; tag/note writes are best-effort. (#198)
- Shopify cart actions (`removeItem`/`addItem`/`updateItemQuantity`) share a
  `runCartAction` helper for the IP + standard rate-limit prelude instead of
  inlining it three times; behavior is unchanged.

#### Docs and structure

- Agent-readable delivery is now a starter primitive: one typed catalog feeds `/ai`, `/llms.txt`, the sitemap, route-specific Markdown alternates, agent use guidance, and real developer-resource links. Page requests negotiate `text/html` and `text/markdown` with q-value handling, explicit `.md` aliases, 406 responses for CMS pages that do not have a truthful Markdown body, and recoverable Markdown 404s. Vercel appends `Accept` to the final HTML `Vary` header at the edge after Next writes its router fields; self-hosted deployments need the equivalent post-render reverse-proxy rule.
- App: `error.tsx` and `global-error.tsx` render a shared `ErrorView`; `APP_BASE_URL` is exported once from `lib/env`; `fb:app_id` reads from validated env; `next.config.ts` exports its config directly; dead nav scroll-lock and its orphaned store removed.
- components/ui: form registration is name-based instead of index-based; `real-viewport` slimmed to setting only `--scrollbar-width`; Base UI triggers use render props; `fetchJSON` responses are schema-validated; conditional `className` spreads replaced with `cn()`.
- Styles: easings and colors are each defined once — `css/easings.css` is a hand-authored `@theme` partial outside the generator — and the `nesting-rules` no-op was dropped from the PostCSS chain.
- Fonts now load via `next/font/google` (Oswald for display, Spline Sans Mono for body) instead of self-hosted woff2 — no font binaries ship in the repo, and the brand type scale (sizes, line-heights, tracking from the Figma spec) is encoded in `lib/styles/typography.ts`. (#210)
- Components are now catalogued in Storybook (`bun storybook`) instead of an in-app `/components` page; added stories for accordion, alert-dialog, checkbox, link, marquee, menu, switch, and tabs. (#210)
- `app/page.tsx` is now a self-contained in-app manual (clone → ship); replace it with your homepage and delete `app/page.module.css` when you start a project. (#210)
- Consolidated root docs: folded `BOUNDARIES.md` into `ARCHITECTURE.md` and
  refreshed the doc maps in `README.md` and `AGENTS.md` (#177).
- components/ui: `Form`/`FormProvider` collapsed into a single `Form`;
  `Checkbox` and `Switch` share an extracted control subtree across their
  label / no-label branches; dead `foldRef` dropped from `Fold`.

#### Dependencies

- Dependencies: bumped every package to its latest version. The only breaking change was `tempus` dev.18, whose `TempusCallback` moved from positional `(time, deltaTime)` arguments to a single `TempusState` object (`{ time, deltaTime, frame, budget }`) and deprecated the `priority` option in favor of `order` — migrated all seven call sites (the GSAP, Lenis, marquee, and WebGL RAF runtimes, the `lib/utils/raf` write queue, and the dev `Stats` overlay). Also bumped `@base-ui/react` 1.6, `next-sanity` 13.1, `@types/node` 26, `deslop-cli` 0.5.8, `@biomejs/biome` 2.5.1, Storybook 10.4.6, and Tailwind 4.3.1; `actions/checkout` 6 → 7 in CI. Supersedes #251–254. (#255)
- Dependencies: bumped the Sanity toolchain to v6 (`sanity`, `@sanity/vision`, `groq` → `^6.1.0`) — Studio v6's breaking changes (Node 20 dropped, `auth.providers` replace semantics, `enableLegacySearch` removed) don't touch the integration's API surface, so forks on Node ≥ 22 update without code changes. Also bumped `@biomejs/biome` 2.5.0 and `deslop-cli` 0.0.25. Biome 2.5's newly-enabled rules required a `<title>` on `darkroom.svg` (`noSvgWithoutTitle`) and an import-spacing fix in generated `sanity.types.ts` (`organizeImports`); the inline version `<Script>` carries a documented `useInlineScriptId` ignore (the `id` is present — biome mis-detects JSX-children content). Supersedes #221–226. (#228)
- Dependencies and lib/utils: removed `cross-env` (the `analyze` script sets `ANALYZE=true` inline); `@theatre/core` moved to `dependencies` (imported by `lib/webgl/utils/fluid` and `flowmaps`); bumped `groq` and `next-sanity`; deleted the unused `lib/utils` modules `context`, `animation`, `viewport`, and `easings`, with docs updated to match. (`postprocessing` is a dependency again — see the WebGL forward-port above.)

### Removed

- The HubSpot Forms API path: `getForm` (`lib/integrations/hubspot/fetch-form.ts`), the `formsApi` registry capability, `hubspotFormsApiEnvSchema`, and the `NEXT_HUBSPOT_FORM_ID` env var. The embed path is the supported way to render HubSpot forms; nothing in the starter called the fetch path.
- The `evil` color theme. `Wrapper`'s `theme` prop, `themeNames`, the Storybook theme toolbar, and the generated `[data-theme=evil]` CSS now cover `light`, `dark`, and `red` only.
- CSS linting. oxlint has no CSS parser, so the Biome CSS rules (`noUnknownFunction`, `noUnknownProperty`, `noDescendingSpecificity`, `noDuplicateCustomProperties`, `noUnknownMediaFeatureName`) have no counterpart and the 15 CSS `biome-ignore` comments they needed are deleted. `oxfmt` still formats every stylesheet, CSS Modules and Tailwind v4 at-rules included.

- The `satus add`/`satus list` CLI (`bun run satus`) and the GitHub-tarball payload fetch behind it. It let you restore a stripped integration into a live project, but almost nobody used it, it downloaded and extracted an archive from a remote ref with no path checks, and its `--force` flag silently did nothing. `setup:project` — the command every project and `create-darkroom` actually run — is unaffected and stays the one way to configure a fresh clone. The one thing worth keeping from the old CLI came with it: `setup:project` now expands a kept integration to include whatever it requires (keeping `theatre` also keeps `webgl`, since theatre's bindings depend on it), fixing a bug where `--keep theatre` used to strip webgl out from under it and leave a build that doesn't compile.
- The in-app `/components` showcase, the `app/(examples)/` example routes (R3F, Sanity, Shopify, HubSpot), and the `app/studio/` route — component demos moved to Storybook and integration usage distilled into `// USAGE` comments in `lib/integrations/*`. Only the demo surface is gone; the reusable integration code stays. (#210)
- Unused `groq` dependency — `next-sanity`'s `defineQuery` covers GROQ and
  nothing imported the standalone package (it remains available transitively).
- Unused `components/ui/scroll-restoration` component (zero consumers).
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

### Added

- `sitemap.xml` and `/llms.txt` now read from Sanity when it's configured, instead of only ever listing the home page and `/ai`. Both enumerate the same CMS content through one shared helper (`lib/seo/routes.ts`), gated on `isConfigured('sanity')` — a fresh clone with no CMS env set gets the static routes only, and a CMS that's configured but unreachable (bad project ID, deleted dataset) degrades the same way instead of 500ing the sitemap. `lib/seo/site.ts` now exports the normalized `BASE_URL` that `app/robots.ts`, `app/sitemap.ts`, and `/llms.txt` all resolve absolute URLs from, so the three can't drift out of sync on the fallback chain. (#319)
- `post-checkout` lefthook hook that clears `.next/types` + `.next/dev/types` on branch switches (git flag `1` only — file checkouts untouched, rebases skipped), killing the ghost `tsc` errors caused by the previous branch's generated route types. Types regenerate on the next dev/build.
- Minimal Playwright E2E harness (`e2e/home.e2e.ts`) — smoke spec covering page render, zero console errors, and zero critical/serious a11y violations (via `@axe-core/playwright`). Run with `bun run test:e2e`. Specs use `.e2e.ts` extension so `bun test` ignores them. (#e2e)
- Instant-navigation regression test (`e2e/instant-navigation.e2e.ts`) using `@next/playwright`'s `instant()` helper — wraps the 404 page's "Go Home" link click and asserts the home shell paints without waiting on the network, so a refactor that de-opts instant navigation (a `cookies()` read leaking into a shared layout, a moved Suspense boundary) fails CI instead of going unnoticed. (#339)
- Storybook themed to match Satūs: stories render on the site palette through shared CSS tokens (edit the site, the catalogue follows), with a dark/light/red/evil theme toolbar and a branded manager. (#210)
- `bun run check:assets` (wired into `bun run check` and CI) fails the build on tracked videos over 2MB or raster images wider than 2400px/heavier than 1MB, reading dimensions straight from PNG/JPEG/WEBP/GIF headers with no new dependency — a format it can't parse (AVIF, or anything corrupt) fails the check rather than passing unverified. `lib/styles/css/index.css` now declares an explicit two-layer cascade (`@layer base, utilities;`): `reset.css` sits in `base`, Tailwind's utilities (built-in and custom `@utility`) sit in `utilities`, so a utility reliably beats the browser reset and an unlayered CSS Module still beats both — guarded by a new regression test. `Image` stopped writing `objectFit` as an inline style unless a caller passes it explicitly; the `cover` default now comes from a zero-specificity `:where()` rule riding the same `utilities` layer, so a Module or Tailwind `object-*` utility can override it. The Lighthouse workflow trades Vercel's Protection Bypass for Automation secret (`VERCEL_AUTOMATION_BYPASS_SECRET`) for Vercel's own short-lived, deployment-scoped bypass cookie in a preflight step, and only that cookie — never the standing secret — goes into Lighthouse's settings, since Lighthouse copies its resolved settings into the report this workflow publishes; it skips loudly when the secret is unset and fails outright if the bypass doesn't actually clear the SSO redirect. A tripwire test asserts `proxy.ts` still imports and calls `rate-limit`, so deleting or gutting it fails `bun test` instead of silently turning off API rate limiting. (#317)
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

- Audit remediation, 2026-08-05 sweep (report in `docs/audits/codebase-audit-2026-08-05.md`, findings cited by issue; #401–#408). **Content that was published but unreachable now renders**: Sanity `page` and `article` documents were listed in `sitemap.xml` and `/llms.txt` and previewed in Studio at URLs no route served, so every one 404'd — pages now render at their slug via a catch-all that replaces `[...unmatched]` and keeps its in-chrome 404 job, articles at `/articles/[slug]` with their JSON-LD wired in (#378). A project configured with a read token but no `SANITY_PRIVATE_TOKEN` rendered no CMS content anywhere, because `sanityFetch` fell back to a null stub that every consumer goes through, while the README called that token optional; published content now fetches through the client and tags its cache entry so the revalidation webhook still reaches it (#379). Provisioning with Sanity's own CLI convention (`SANITY_STUDIO_PROJECT_ID`) read as unconfigured everywhere except `/studio`, blanking the front end and 404ing the Studio after hydration (#380). **Form abuse is now bounded**: Turnstile verification ran before the rate limiter on every public action, so garbage tokens were never throttled and each one held a serverless invocation open for up to 5s waiting on Cloudflare — the limiter runs first, verification moved inside `runFormAction` so there is one ordering, and Shopify customer login and register verify for the first time (#377). Mailchimp advertised GDPR double opt-in while hardcoding `status: 'subscribed'`; new addresses now default to `'pending'`, and only `status_if_new` is sent so a re-submission cannot knock a confirmed subscriber back to unconfirmed. **`setup:project` fails recoverably**: a transform marked required was skipped in silence when its target file had been renamed, and self-prune deleted the script even when transforms had failed, so the documented "fix the cause and re-run" had nothing left to run (#381, #382); the preflight now also validates transform targets (#389). `generate` and `handoff` hung then exited 0 on closed stdin — in CI or any agent harness they reported success having done nothing — and the changelog and process-audit report both credited #370 with a fix that only ever covered `setup:project` (#383). **Shopify menu links resolve**: a handle merely containing `pages` was rewritten into a dead route, and external links were collapsed into local ones (#384); catalog products silently lost `featuredImage` to a schema that omitted it, blanking every optimistic cart thumbnail (#386); the webhook secret is compared in constant time. **Theatre.js is out of production bundles** — every WebGL-capable visitor was loading its runtime and fetching a config that did not match the sheet in use, behind two comments claiming none of it shipped (#385). Negative column utilities computed widths wrong by `2(N-1) × gap`, and ~28 sibling utilities emitted invalid CSS (#394); `mobile-vh()` always resolved to the address-bar-hidden `vh` its own house rule exists to avoid (#395). A required form field that unmounted left `isReady` false forever, making the form permanently unsubmittable with nothing on screen to fix; `ProgressText` desynced once its word count shrank (#397); one malformed CMS document emptied the whole sitemap; the custom scrollbar gained keyboard operation and ARIA value semantics; `Image`'s `block` prop, which allowed a call that typechecked and then threw, is gone (#393); `handoff` no longer deletes the Turnstile site key (#387); two HubSpot embeds on one page no longer collide on a shared DOM id (#391); `doctor`'s lefthook check no longer false-fails in a linked worktree; the Block Components generator category that could never appear in COMPONENTS.md is gone (#388).
- Draft-mode previews stop losing their session to a prefetch. The "Disable Draft Mode" pill was a prefetching `Link`, so the router's speculative fetch of `/api/draft-mode/disable` ran the handler and deleted the draft cookies out from under an open preview; reloads only sometimes recovered because it was a race. The route now answers prefetch/RSC fetches with 204 and disables only on a real document navigation (the cross-site 403 guard runs first, so a cross-site request still gets 403 whatever headers it carries), the pill renders only in a conclusively standalone context — the visual-editing hook falls back to `standalone` after 1s when the Presentation handshake is slow, so iframe and popup contexts stay hidden regardless — and the pill is a plain anchor rather than the prefetching primitive. (#372)

### Documentation

- Adversarial codebase audit, 2026-08-05 (`docs/audits/codebase-audit-2026-08-05.md`): 8 high, 13 medium, 11 low, one info, filed as #373–#400. Seven parallel area auditors read their surfaces in full with a bounded cross-model verify pass over the finding list; team-knowledge reconciliation ran after the findings existed so documented decisions could reclassify severity without suppressing anything. The report carries a post-publication correction: the draft-mode surface it listed as sound was not, and #372 fixed it hours later — the audit asked what each route handler does when called, never who else can call it.

- Process-audit remediation (2026-08-04 sweep; report in `docs/audits/process-audit-2026-08-04.md`, findings cited by ID; #356–#370). The three scripted journeys now survive their own documented happy paths: `setup:project`'s output builds for every preset — the cache-components opt-out also flips `partialPrefetching` (P-B1), non-integration files that consume sanity/webgl are transformed on strip via new required-match AST ops that fail loudly before self-prune instead of silently no-oping on drift (P-B7), and the kept bundle's dependency pins survive to disk instead of being reverted by a stale package.json write (P-C3) — and leaves `check` green by reformatting exactly the files it touched and regenerating COMPONENTS.md, deferring via a malformed-proof, retry-capped marker under `--skip-install` (P-B2). `handoff` ships a deliverable that builds — branding removal now also strips the footer's logo import (P-C1) — with a newline-terminated inventory (P-C2), a working `--help` (P-C5), an outcome-honest summary (P-C6), and dated snapshot notes on its generated docs (P-C7). `generate` can no longer emit syntax errors for hyphenated names (P-C8), always passes the format gate (P-C9), and refuses to overwrite existing files (P-C10). Cross-cutting: `setup:project`'s `@clack/prompts` calls fail loudly (exit 1) on closed stdin instead of exiting 0 as a silent no-op (P-D2 — `generate`/`handoff` completed later); `setup:project` gains a pid lock with signal-safe release and stale detection (P-B3), a friendly post-prune stub (P-B4), and preset-listing `--help` (P-B6). Onboarding: `bun run check` is self-sufficient on a fresh clone via a guarded `next typegen` step (P-A2); AGENTS.md's warning prose no longer contains the literal managed-block marker that made a second `bun dev` truncate the file (P-A1); the revalidate webhook returns 400, not 500, for malformed JSON (P-D1).
- Audit design decisions resolved (#268; closes out #263/#267). The registry grows capability tiers: `hasCapability('hubspot', 'formsApi' | 'embed')` distinguishes token-backed Forms API access from embed-only portal configs, so a portal-id-only setup no longer reads as "configured" for an API that will always throw; Shopify, Mailchimp, and HubSpot self-gate through the registry instead of re-deriving env inline (Turnstile keeps its direct secret check on purpose — its schema requires both keys, and gating on it would change production fail-closed semantics for secret-only configs). `HUBSPOT_ALLOWED_FORM_IDS` (opt-in, comma-separated) pins which HubSpot forms the newsletter action may submit to. Canvas ownership keeps both of #227's strategies — shared layout canvas (default) or per-page `<Wrapper webgl>` — with the never-both invariant enforced at runtime (first root wins, second is a no-op) rather than by prose alone; the prop-removal AST transform now also matches aliased destructures. The Storybook proxy fails closed off-Vercel (`VERCEL_ENV`-allowlisted instead of `!== 'production'`, which was open when the var was unset). Recorded decisions: deployment target is Vercel-first (in-memory rate limiter stays as documented best-effort; durable-store upgrade path noted at the source), and the `{ data, error }` route shape vs `{ status, message, fieldErrors }` form-action shape split is intentional (AGENTS.md).
- Audit-issue remediation sweep (#263–#267). Integrations: Shopify menu paths are derived by URL parsing instead of a string-replace against the raw store domain — correct for scheme-less env values and custom-domain storefronts (#263 C1/M8); Mailchimp reports missing configuration as `config_error` with the real message instead of mislabeling it a network error (#263 M6); Turnstile siteverify now sends `remoteip` (#263 L6); cart quantity/remove buttons disable while their server action is in flight, so double-clicks can't drop an update (#263 M7). Scripts: a second `bun run handoff` refuses to clobber `README.original.md` unless `--force` is passed (#264 H5); `--yes` is honored for real — `--preset`/`--keep` at an interactive terminal now confirm before stripping, while non-TTY (scaffolder/CI) runs stay promptless (#264 H6); self-prune derives its test-file list from a glob plus a keep allowlist instead of a hardcoded array (#264 L10); CI no longer runs `manifest:check` twice (#264 M18 residual). WebGL: the render gate honors `prefers-reduced-motion` (`force` still bypasses) (#265 M9); GPU sims are opt-in — `simTypes` defaults to none instead of running fluid+flowmap for zero consumers (#265 M10); a second root canvas is a real no-op in every environment, not just a dev warning (#265 M8); the fluid sim clamps frame delta so a backgrounded tab can't corrupt the simulation (audit 07-09 H3); deleted the dead `Program` class (#265 L9). Security: invalid env vars fail with a readable per-variable message instead of a raw Zod error (#267 M3); `fetchWithTimeout` honors already-aborted signals and detaches its abort listener (#267 L5); `draft-mode/disable` rejects cross-site requests via `Sec-Fetch-Site` (#267 L2); the deprecated `X-XSS-Protection` header is gone and the enforced `frame-ancestors` policy is integration-agnostic so `setup:project` stripping keeps it valid (#267 L1). Docs: `bun build` → `bun run build` everywhere, real import examples, deleted-component rows removed, `--dry-run` documented, `fieldErrors` type corrected, `engines.node >= 22` enforced in package.json, TypeScript 6 in the stack table, and Turnstile listed in the integrations table (#266).
- Adversarial audit remediation (see `docs/audits/codebase-audit-2026-07-08.md`; findings cited by ID). Shopify: the Storefront endpoint now normalizes the store domain to `https://` (H1 — following the documented scheme-less `SHOPIFY_STORE_DOMAIN` previously made every API call throw on URL parse), webhook revalidation is actually wired into `app/api/revalidate` with a strippable dispatch (H2), and every `shopifyFetch` call site validates its payload with Zod schemas at the boundary (M2) — which surfaced and fixed four interface mis-models against the Storefront API (nullable `Image.width/height`, nullable `SEO` fields, nullable `Page.seo`, nullable `CartCost.totalTaxAmount`). CLI: `setup:project` validates every bundle path upfront and self-prunes last, so a mid-run failure can't strand a fork in an unrecoverable half-stripped state (H8); `bun install` failures at the end of setup are non-fatal with clear guidance (M5); AST-transform failures now fail the run loudly instead of exiting 0 (M6); `setup:project` guards against running outside the project root (L3) and warns on duplicate flags (L4). Handoff describes what ships on disk, not what's configured in the current shell — installed-but-unconfigured integrations are reported as needing configuration instead of silently omitted from `.env.example`/INVENTORY/DEPLOYMENT-CHECKLIST (H7). Components: `<Image>` requires one of `fill`/`width`+`height`/`aspectRatio` at the type level instead of silently rendering a broken 1×1 (H9); forms seed optional fields as valid and gate Enter-key submission on the same validity the button uses (H10 — an untouched optional field could previously block click-submit forever); the Link component is the single source of truth for external-link detection, with a `newTab` intent prop (L6); marquee cleans up detached nodes (L7) and `usePrefetch` no longer recreates its observer on inline options (L8). WebGL: theatre is live — `SheetProvider` self-bootstraps the project so sheets and the ⌘O Studio actually bind (H11); `WebGLImage` no longer decodes the document URL before `src` resolves and clears stale texture references on src change (M16, M14); `simTypes` is plumbed through the root canvas so pages can skip unused GPU sims (M17); module-scope tempus/storage listeners are HMR-idempotent (M18, L12); mounting two root canvases warns in dev (M19); the fluid splat queue is capped (L11). HubSpot forms validate Turnstile like their Mailchimp siblings (M3). CI/docs: Dependabot auto-merge gates on the CI workflow that actually exists and on the PR author instead of the run actor — the lockfile-sync commit makes the CI actor a PAT identity, which the old actor gate treated as "not Dependabot", permanently skipping exactly the PRs the automation exists for (H3); Playwright e2e runs in CI (M11); `bun run check` includes `manifest:check` (M8); all bun setups pin via `packageManager` (L1); and the documented-but-nonexistent surfaces are gone from the docs — `/studio` route and dead Sanity env vars (H5), `bun build` (M7), WebGPU/TSL renderer claims (M15), removed `measure`/`batch` raf exports (L9), wrong `useDeviceDetection` keys (L10), and the unreachable `SOURCE_MAPS` flag (L2).
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

[Unreleased]: https://github.com/darkroomengineering/satus/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/darkroomengineering/satus/compare/v2.0.1...v3.0.0
[2.0.1]: https://github.com/darkroomengineering/satus/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/darkroomengineering/satus/releases/tag/v2.0.0
