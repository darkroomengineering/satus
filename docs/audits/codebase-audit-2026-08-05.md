# Adversarial codebase audit — 2026-08-05

Scope: whole repo, codebase (correctness) mode — defects, incoherences, affordance
mismatches, doc drift in code-adjacent claims, DX. Method: seven parallel area
auditors reading their surfaces in full, disprove-first, every finding traced to
lines or reproduced; bounded Codex cross-model verify pass on the finding list
(9/10 CONFIRM, 1 scenario correction, 4 adopted additions — each independently
re-verified before adoption); team-knowledge reconciliation after findings
existed (no reclassifications; two stale notes flagged). Prior-audit ledgers
(07-08, 07-09, 08-02 codebase; 08-04 docs; 08-04 process) were loaded first and
their settled items are not re-litigated.

Coverage caveat: `components/ui/{accordion,checkbox,switch,tabs,tooltip,marquee,fold,real-viewport,not-configured}`
and `react-scan-provider.tsx` were not deep-traced this pass (no findings
asserted or cleared for them); everything else listed per-area below was read in
full.

## 1. Summary table

| ID  | Sev    | Area       | Issue                                                                                              | Location                                                                    | Status                                  |
| --- | ------ | ---------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------- |
| H1  | High   | Forms      | Turnstile verification runs before rate limiting; garbage-token floods are never throttled         | `lib/utils/form-action.ts:41-43` + both actions                             | CONFIRMED                               |
| H2  | High   | CMS/SEO    | CMS `page`/`article` docs sitemapped + llms.txt'd with zero rendering route — 404 trap             | `lib/seo/routes.ts:84-139`, `sanity/utils/link.ts:39-42`                    | CONFIRMED (×2 agents + Codex)           |
| H3  | High   | Sanity     | No `SANITY_PRIVATE_TOKEN` → `sanityFetch` is a null stub for ALL content; docs claim otherwise     | `lib/integrations/sanity/live/index.tsx:25-52`                              | CONFIRMED (Codex-found)                 |
| H4  | High   | Sanity     | `SANITY_STUDIO_PROJECT_ID`-only config breaks frontend AND `/studio` (hydration 404)               | `lib/utils/validation.ts:22-29`, `sanity/env.ts:29-32`                      | CONFIRMED (scenario corrected by Codex) |
| H5  | High   | Scaffold   | `required: true` AST ops silently skipped when target file missing                                 | `lib/scripts/ast-transforms/index.ts:296`                                   | CONFIRMED (reproduced)                  |
| H6  | High   | Scaffold   | selfPrune runs despite collected transform failures; docstring's re-run recovery is false          | `lib/scripts/setup-project.ts:1193-1236`                                    | CONFIRMED                               |
| H7  | High   | CLIs       | `generate`/`handoff` still hang→exit 0 on stdin EOF; ledger + CHANGELOG overstate #370             | `lib/scripts/generate.ts:47-50`, `prepare-handoff.ts:551-622`               | CONFIRMED (reproduced)                  |
| H8  | High   | Shopify    | `menuItemPath` corrupts menu URLs: unanchored remaps + external links collapsed to local paths     | `lib/integrations/shopify/pages.ts:38-47`                                   | CONFIRMED (reproduced)                  |
| M1  | Medium | WebGL/dev  | Theatre runtime self-bootstraps + fetches config in production; comments claim dev-only            | `lib/dev/theatre/index.tsx:41-69,109-118`                                   | CONFIRMED                               |
| M2  | Medium | Shopify    | `shopifyProductSchema` strips `featuredImage` the fragment fetches and the type declares           | `lib/integrations/shopify/schemas.ts:100-117`                               | CONFIRMED (reproduced)                  |
| M3  | Medium | Handoff    | Env cleanup deletes `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` (regex misses the prefix)          | `lib/scripts/prepare-handoff.ts:295-301`                                    | CONFIRMED (reproduced)                  |
| M4  | Medium | Generators | "Block Components" category generates fine but can never appear in COMPONENTS.md                   | `lib/scripts/generate-component.ts:57-61` vs `generate-manifest.ts:378-396` | CONFIRMED                               |
| M5  | Medium | Scaffold   | Preflight validates bundle paths but not the files codeTransforms actually target                  | `lib/scripts/setup-project.ts:386-428`                                      | CONFIRMED (dormant)                     |
| M6  | Medium | Scaffold   | `applyOverwriteFiles` local-modification safety net is dead code post-#277; JSDoc sells it as live | `lib/scripts/bundle-installer.ts:100-139`                                   | CONFIRMED                               |
| M7  | Medium | HubSpot    | `EmbedHubspotForm` default `target` id collides across instances; second embed stays empty         | `lib/integrations/hubspot/embed/index.tsx:12,39-42,71-75`                   | CONFIRMED code / PLAUSIBLE runtime      |
| M8  | Medium | SEO        | `/sanity` example route has no `noindex`; sitemap omission is the only guard                       | `app/(site)/(examples)/sanity/page.tsx:60-70`                               | CONFIRMED                               |
| M9  | Medium | Components | `Image`'s `block` prop escapes the sizing union → type-valid call crashes at runtime               | `components/ui/image/index.tsx:104-105,256,313`                             | CONFIRMED (dormant)                     |
| M10 | Medium | Styles     | Column-utility CSS broken two ways: literal `value` in calc + wrong sign on negative gap term      | `lib/styles/scripts/generate-scale.ts:101-117`                              | CONFIRMED (in committed CSS)            |
| M11 | Medium | Styles     | `mobile-vh()` clamp always collapses to plain `vh`, defeating its purpose                          | `lib/styles/scripts/postcss-functions.mjs:21-25`                            | CONFIRMED mech (dormant)                |
| M12 | Medium | Env        | `lib/env.ts` lacks the `assertServerEnvironment()` guard registry.ts got post-08-02                | `lib/env.ts:88`                                                             | PLAUSIBLE (dormant)                     |
| M13 | Medium | Effects    | `ProgressText` stale detached-node refs desync per-word reveal thresholds                          | `components/effects/progress-text/index.tsx:86-93,116-119`                  | CONFIRMED                               |
| L1  | Low    | Shopify    | `index.ts` usage example uses a nonexistent `variants` prop; disagrees with README                 | `lib/integrations/shopify/index.ts:26`                                      | CONFIRMED                               |
| L2  | Low    | Shopify    | `AddToCart` lacks the `useFormStatus().pending` guard its sibling cart buttons use                 | `lib/integrations/shopify/cart/add-to-cart/index.tsx:64-71`                 | CONFIRMED                               |
| L3  | Low    | Sanity     | `example` schema registered in Studio with zero queries/routes; README tutorial's own model        | `lib/integrations/sanity/schemas/example.ts`                                | CONFIRMED                               |
| L4  | Low    | Sanity     | README Marketplace table vs `lib/env.ts:48` disagree on what `SANITY_STUDIO_PROJECT_ID` serves     | `lib/integrations/sanity/README.md:39-44`                                   | CONFIRMED                               |
| L5  | Low    | Generators | `buildHooksSection` missing the `.test.ts`/`.d.ts` filter `buildUtilsSection` has                  | `lib/scripts/generate-manifest.ts:214-264`                                  | CONFIRMED (dormant)                     |
| L6  | Low    | Scripts    | `doctor.ts` lefthook check false-fails in linked worktrees; its fix text reproduces the failure    | `lib/scripts/doctor.ts:122-126`                                             | CONFIRMED                               |
| L7  | Low    | Dev tools  | Orchestra 🧊 WebGL toggle is inert; README documents it as the canvas switch                       | `lib/dev/cmdo.tsx:48-50`, `lib/dev/index.tsx:44`                            | CONFIRMED                               |
| L8  | Low    | Utils      | `isEmptyArray` JSDoc example asserts the opposite of tested behavior                               | `lib/utils/strings.ts:70-87`                                                | CONFIRMED                               |
| L9  | Low    | Utils      | `parseFormData` collapses multi-value FormData keys last-wins, silently                            | `lib/utils/validation.ts:182-185`                                           | PLAUSIBLE (dormant)                     |
| L10 | Low    | SEO        | Dead exports: `articleSchema`/`breadcrumbSchema`/`articleQuery` have zero callers                  | `lib/seo/schemas.ts:55-93`, `sanity/queries.ts:39`                          | CONFIRMED                               |
| L11 | Low    | SEO        | `getCmsRoutes` parses documents all-or-nothing; one malformed doc empties the CMS sitemap          | `lib/seo/routes.ts:110-111`                                                 | CONFIRMED (Codex-found, dormant)        |
| I1  | Info   | Shopify    | 08-02 open question on `client.ts` client-safety: narrowed, not closed                             | `lib/integrations/shopify/client.ts:30-31,50`                               | CONFIRMED (partial)                     |

## 2. System map (as verified)

- **Entry tiers.** `app/layout.tsx` is a bare shell; `(site)/layout.tsx` mounts
  Lenis/Wrapper/OptionalFeatures; `app/studio` sits outside `(site)` with its own
  layout and `noindex`. Metadata routes (`sitemap.ts`, `robots.ts`, `manifest.ts`,
  `llms.txt/route.ts`) share `lib/seo/routes.ts` (`STATIC_ROUTES` + `getCmsRoutes()`)
  as a single source — sound pattern, but it enumerates content nothing renders (H2).
- **Integration spine.** `lib/utils/validation.ts` holds per-integration Zod env
  schemas; `lib/integrations/registry.ts` derives `isConfigured()` etc. and now
  guards all five exports with `assertServerEnvironment()` (verified). `lib/env.ts`
  is a parallel, module-scope `safeParse(process.env)` singleton with **no** guard
  (M12), and `lib/integrations/sanity/env.ts` is a third resolution path with
  alias fallbacks the schema doesn't know (H4). Key invariant, still enforced
  nowhere statically: any module reachable from a `'use client'` file is
  dual-compiled, and wholesale `process.env` reads resolve to `{}` in the browser.
  Dual compilation means even "read from the same module" does not guarantee the
  same answer on both sides — the alias fallback in `sanity/env.ts` works
  server-side and is invisible client-side.
- **Content pipeline.** `sanityFetch` (from `live/index.tsx`) is the single fetch
  path for CMS content; it is the real thing only when `isConfigured('sanity') && client && privateToken !== ''`
  — otherwise a null-data stub (H3). Consumers: the `/sanity` example page and
  `getCmsRoutes()`.
- **Scaffold pipeline.** create-darkroom → `bun run setup:project` (public
  cross-repo contract per team-knowledge) → preflight (bundle paths only, M5) →
  strip/re-add via `INTEGRATION_BUNDLES` + AST transforms (missing-file `continue`,
  H5) → selfPrune (ungated on collected failures, H6). Failure taxonomy is
  three-way — throw (`RequiredOpMatchError`), collect (`TransformFailure[]`),
  skip (missing file) — and only the first reliably protects the run.
- **WebGL.** Root canvas + tunnel portal; dual-canvas guard, reduced-motion gate,
  simTypes opt-in, and GPU disposal all verified sound. The Theatre _runtime_
  half rides along into production (M1); the Studio editor half is genuinely
  dev-gated.

### Expectation gaps (short form)

- Expected the rate limiter to bound every public form action → the one outbound
  network call happens before it (H1).
- Expected every Studio-creatable document to render somewhere → `page`, `article`,
  and `example` all have no live render path (H2, L3).
- Expected "published-content fetching does not depend on privateToken" (in-code
  comment) → all content fetching depends on it (H3).
- Expected `required: true` to mean "loud failure on drift" → silent skip when
  the file is missing (H5).
- Expected the process-audit's "EOF → exit 1" claim to cover the three CLIs it
  names → it covers one (H7).
- Expected Shopify menu links to survive path remapping → handles containing
  `pages`/`collections` are mangled and external links become local dead routes (H8).

## 3. Findings

### High

**H1 — Turnstile verification runs before rate limiting** — `lib/integrations/hubspot/action.ts:51-56`, `lib/integrations/mailchimp/action.ts:44-49,76-81`, `lib/utils/form-action.ts:41-43` — CONFIRMED. [boundary/safety]
All three public form actions call `validateFormWithTurnstile()` and return on
failure before `runFormAction` — where `rateLimit()` lives — ever runs. Every
request with a non-empty garbage token triggers a real Cloudflare siteverify
POST with a 5s timeout. Scenario: 500 req/min from one IP with
`cf-turnstile-response=garbage` — each holds a serverless invocation up to 5s,
none are throttled. The ordering is documented as deliberate in
`form-action.ts:41-43`, but the cost was never traced — this is a
documented-decision-gone-stale escalation, not an oversight claim. Direction:
run the cheap in-memory limiter first, or fold Turnstile into `runFormAction`
after it.

**H2 — CMS `page`/`article` documents are sitemapped and llms.txt'd with zero rendering route** — `lib/seo/routes.ts:84-139`, `lib/integrations/sanity/utils/link.ts:39-42`, `lib/integrations/sanity/queries.ts:39-66`, `schemas/page.ts:62`, `schemas/article.ts:110` — CONFIRMED, independently by two auditors + Codex. [incoherence + affordance]
`resolveDocumentUrl` maps `page` → `/${slug}` and `article` → `/sanity/${slug}`;
no `[slug]` route exists anywhere under `app/` (the only Sanity-backed page is
the fixed-slug tutorial). Yet `getCmsRoutes()` enumerates every published
`page`/`article` into `sitemap.xml` and `/llms.txt`, Studio previews coach
editors with the exact unservable URL, the shared `link` object type offers
`article` as a target, and the Presentation tool maps `/sanity/:slug`. Scenario:
editor creates page `about` → sitemap advertises `/about` → visitors and
crawlers get the `[...unmatched]` 404. `route-sweep.e2e.ts` skips dynamic
segments, so no test can catch it. Direction: ship a `[[...slug]]` catch-all
dispatching on `_type`, or scope `getCmsRoutes()`/the link schema to types that
actually render.

**H3 — Sanity without `SANITY_PRIVATE_TOKEN` silently loses ALL content** — `lib/integrations/sanity/live/index.tsx:25-52` — CONFIRMED (Codex-found, independently verified). [correctness + documentation]
`sanityLiveReady = sanityReady && privateToken !== ''`; when false, the exported
`sanityFetch` is a stub returning `{ data: null }`. Both consumers — the
`/sanity` page and `getCmsRoutes()` — go through `sanityFetch`, so a project
configured with projectId/dataset/read-token but no editor token renders no
content and publishes no CMS routes. The README (`sanity/README.md:12-14`)
scopes the token to "Visual Editing & Live Preview", and the in-code comment
(`live/index.tsx:19-23`) says published fetching "is unaffected" — both wrong in
practice. This is the sharp edge of the 07-09 M11 fix (which correctly stopped
`defineLive` from erroring on an empty token). Direction: fall back to plain
`client.fetch` with the published perspective when there's no private token, or
make the token genuinely required and say so everywhere.

**H4 — alias-only Sanity config (`SANITY_STUDIO_PROJECT_ID`) breaks both surfaces** — `lib/utils/validation.ts:22-29`, `lib/integrations/sanity/env.ts:29-32`, `lib/integrations/registry.ts:224-227` — CONFIRMED (scenario corrected by the Codex pass). [incoherence]
`sanityEnvSchema` only recognizes `NEXT_PUBLIC_SANITY_PROJECT_ID`, but
`sanity/env.ts` honors `SANITY_STUDIO_PROJECT_ID` — Sanity's own CLI convention,
listed as recognized in `integration-bundles.ts:132`. A project provisioned with
only the alias gets: frontend blank (`isConfigured('sanity')` false server-side,
so `client` is null, `sanityFetch` stubs, draft-mode 503s) **and** `/studio`
broken too — the alias read is a non-`NEXT_PUBLIC` member expression that is
never inlined into the client bundle, so the dual-compiled `sanity.config.ts`
evaluates `projectId` to `''` in the browser and the hydration backstop
`notFound()`s: SSR shows the Studio, hydration replaces it with a 404. This also
means the 08-02 fix's "both gates read the same module so they cannot disagree"
holds only for non-aliased config — dual compilation makes one module give two
answers. Direction: teach `sanityEnvSchema` the alias (single source with
env.ts), and treat non-inlinable fallbacks in client-reachable modules as a
lint-able hazard.

**H5 — `required: true` AST ops are silently skipped when the target file is missing** — `lib/scripts/ast-transforms/index.ts:296` — CONFIRMED (reproduced). [correctness]
`applyCodeTransforms` does `if (!(await file.exists())) continue` before any op
runs: the whole transform — including `required: true` ops — is skipped with no
throw, no `failures` entry, no log. Reproduced: a transform against a
nonexistent file returns `{ changes: 0, failures: [] }`. This defeats the exact
drift-detection contract `required` was added for (`ast-operation-types.ts:8-25`).
Scenario: a fork renames `lib/seo/routes.ts`; `setup:project` strips integrations,
misses the required edits, and self-prunes none the wiser. Direction: a missing
file combined with any `required: true` op must be a hard failure.

**H6 — selfPrune runs even when transform failures were collected** — `lib/scripts/setup-project.ts:1193-1236` vs docstring `:1080-1126` — CONFIRMED. [correctness + documentation]
Steps 8/10 collect `TransformFailure[]`; step 11 (selfPrune) is not gated on
them. The orchestration docstring promises "any failure in steps 3–8 leaves
lib/scripts/setup-project.ts … intact, so the run can simply be repeated" — true
only for thrown errors, not for the collected-failure path the same file
documents as the intended non-aborting mode. The user gets a loud exit 3, but
the script and `test:setup` are already deleted, so the promised recovery
doesn't exist. Carried-forward 07-09 M1; absent from the #369/#370 fix lists; no
test asserts "failure ⇒ no selfPrune". Direction: gate step 11 on
`addFailures.length + cacheResult.failures.length === 0`.

**H7 — `generate` and `handoff` still hang then exit 0 on stdin EOF; the ledger and CHANGELOG say otherwise** — `lib/scripts/generate.ts:47-50`, `generate-component.ts:38-90`, `prepare-handoff.ts:551-560,563-607,615-622` — CONFIRMED (reproduced on both entrypoints). [process regression-class + doc drift]
The actual EOF fix (`guardedPrompt`, `generate-shared.ts:114`) is imported only
by `setup-project.ts` — #370's own commit message says the other files were
untouched — yet `process-audit-2026-08-04.md` and `CHANGELOG.md` both record
P-D2 as "fixed #370 (EOF → exit 1)" for `generate`, `setup:project`, and
`handoff`. Scenario: `bun run generate </dev/null` (any CI/agent harness without
a TTY) hangs, then exits 0 having done nothing. Also: explicit Ctrl+C exits 0 in
`generate.ts:47-50`/`prepare-handoff.ts:619-622` against the `cancelGuard`
exit-1 convention, and `handoff --help` documents a `--verbose` flag nothing
reads. Direction: route all prompt-driven CLIs through `guardedPrompt`; correct
the CHANGELOG/ledger claim in the same PR.

**H8 — `menuItemPath` corrupts Shopify menu URLs two ways** — `lib/integrations/shopify/pages.ts:38-47` — CONFIRMED (reproduced). [correctness]
(a) The app-route remap is two unanchored `String.replace()` calls:
`menuItemPath('https://store.myshopify.com/products/pages-and-things')` →
`'/products-and-things'` — any handle containing `/pages` or `/collections` as a
substring is silently mangled into a dead route, rendered from the store's own
navigation. (b) Codex-found, verified: every absolute URL is collapsed to
`pathname + search` — including menu items deliberately pointing at external
sites — so an Instagram link becomes a dead local route, and fragments are
dropped. Direction: anchor the remaps to the leading segment
(`/^\/collections(?=\/|$)/`, `/^\/pages\//`) and pass through URLs whose host is
neither the store domain nor a connected custom domain.

### Medium

**M1 — Theatre runtime self-bootstraps and fetches in production** — `lib/dev/theatre/index.tsx:41-69,109-118`, `lib/webgl/components/canvas/webgl.tsx:8`, `lib/dev/theatre/hooks/use-theatre.ts:35-36` — CONFIRMED. [incoherence + perf]
`SheetProvider` (statically imported into every canvas mount) self-bootstraps a
live Theatre project when no ancestor exists — always — and `fetch()`es
`/config/Satus-R3f.json` with no dev gate, so every production WebGL visitor
pays a Theatre runtime + network fetch + `onValuesChange` subscription. Two
comments claim "none of it ships to users" — true only for the Studio editor
half. The checked-in config lacks the `webgl` sheet the runtime uses, so the
fetched state applies to nothing. Escalation of still-open 07-09 H11 (previously
inert, now live). Direction: gate the runtime path behind the same dev flag as
Studio, or lazy-load `@theatre/core` only when Studio toggles on.

**M2 — `shopifyProductSchema` strips `featuredImage`** — `lib/integrations/shopify/schemas.ts:100-117` vs `fragments/product.ts:44-46` vs `types.ts:195` — CONFIRMED (reproduced). [incoherence]
The fragment fetches it, the type declares it, the schema omits it — Zod strip
mode deletes it from every catalog product. The one consumer,
`cart/optimistic-utils.ts:171`, therefore always seeds optimistic cart lines
with `null`, so the cart-drawer thumbnail is blank on every add until
`router.refresh()`. Direction: add `featuredImage: shopifyImageSchema.nullable()`.

**M3 — handoff env cleanup deletes the Turnstile site key** — `lib/scripts/prepare-handoff.ts:274-323` (alwaysKeep `:295-301`) vs `lib/env.ts:70-71` — CONFIRMED (reproduced in isolation). [correctness]
`/^CLOUDFLARE_/` doesn't match `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`, and
Turnstile has no bundle so `keepVars` never protects it either: `bun run handoff`
silently deletes the site key while keeping its secret sibling. Direction: strip
the `NEXT_PUBLIC_` prefix before testing, mirroring `ownsKey()` in
`env-drift.test.ts:49-54`.

**M4 — generator's "Block Components" category is a dead end** — `lib/scripts/generate-component.ts:57-61,182-187` vs `lib/scripts/generate-manifest.ts:378-396` — CONFIRMED. [affordance]
The prompt offers it and the barrel export supports it, but the manifest only
builds ui/layout/effects sections and `components/README.md` documents only
those three — a generated block never appears in COMPONENTS.md, ever. Direction:
wire a blocks section into the manifest or drop the prompt option.

**M5 — preflight doesn't validate codeTransform target files** — `lib/scripts/setup-project.ts:386-428` — CONFIRMED (dormant in a pristine clone). [missing functionality]
The H8-preflight checks bundle `folders`/`files`/`overwriteFiles` but never the
hardcoded transform targets (`next.config.ts`, `app/(site)/layout.tsx`,
`lib/seo/routes.ts`, …) — the upstream gap that lets H5 go undetected before any
mutation begins. Direction: collect every `CodeTransform.file` across
`INTEGRATION_BUNDLES` + the `CACHE_COMPONENTS_*` transforms into the preflight.

**M6 — `applyOverwriteFiles` safety net is dead code; JSDoc still describes it** — `lib/scripts/bundle-installer.ts:100-139`, `lib/scripts/integration-bundles.ts:84-92` — CONFIRMED. [incoherence]
The only remaining caller passes `force: true`, so the compare-and-skip-with-warning
branch can never fire, and `overwriteSkipped`/`depsMissing` are computed then
discarded (`setup-project.ts:687-696`). Written for `satus add`, deleted in #277.
Direction: simplify to unconditional-overwrite-by-design, or surface the
discarded returns.

**M7 — `EmbedHubspotForm` default `target` id collides across instances** — `lib/integrations/hubspot/embed/index.tsx:12,23,39-42,71-75` — CONFIRMED code / PLAUSIBLE runtime. [correctness]
Two embeds without explicit `target`s produce duplicate
`id="hubspot-form-wrapper"` nodes; both `hbspt.forms.create` calls resolve the
id selector to the first, so the second form stays permanently empty. Distinct
root cause from the ledgered script-dedup item (07-09 M10). Direction: default
the target from `useId()`.

**M8 — `/sanity` example route is indexable** — `app/(site)/(examples)/sanity/page.tsx:60-70` vs `app/studio/layout.tsx:2`, `lib/seo/routes.ts:34-37`, `app/robots.ts:32-48` — CONFIRMED. [incoherence]
The routes file's own comment says demo pages must not be cited by search/AI
indexes, but the only mechanism is sitemap omission — robots allows `/` to every
bot, and the page's `robots` meta comes from an empty optional CMS field.
Direction: hardcode `robots: { index: false }` on the `(examples)` group layout,
the `/studio` pattern.

**M9 — `Image`'s `block` prop escapes the sizing union** — `components/ui/image/index.tsx:104-105,256,313` — CONFIRMED (dormant; no `block={false}` call sites today). [affordance]
`block` sits on the flat intersection, not inside the discriminated sizing
union, so `<Image width={800} height={600} block={false} />` typechecks and then
passes both `fill` and `width`/`height` to `next/image`, which throws. Direction:
fold `block` into the union so the invalid combination can't be expressed.

**M10 — column-utility CSS generation is broken two ways** — `lib/styles/scripts/generate-scale.ts:101-117`, committed `lib/styles/css/tailwind.css:796-804` — CONFIRMED in the committed artifact. [correctness]
(a) The `dr-*-col-value` autocomplete variants emit the literal word `value`
inside `calc()` — invalid CSS, declaration dropped, across ~28 utilities; the
negation path's `.replace('value', '-value')` hits the class _name_ first,
committing `-dr-w-col--value`. Dead but shipped and IntelliSense-suggested.
(b) Codex-found, verified: the _live_ negative wildcard utilities negate only
the column term — `-dr-w-col-N` emits `-N*col + (N-1)*gap` instead of
`-(N*col + (N-1)*gap)`, wrong by `2(N-1)*gap` for every N ≥ 2. Direction:
substitute a real numeric literal in the autocomplete variant, and negate the
whole expression (or both terms) in the negative path.

**M11 — `mobile-vh()` clamp always collapses to plain `vh`** — `lib/styles/scripts/postcss-functions.mjs:21-25` — CONFIRMED mechanism / PLAUSIBLE impact (dormant, zero call sites). [correctness]
`clamp(vh, svh, dvh)`: since `vh ≥ dvh ≥ svh` on modern mobile browsers,
MIN ≥ MAX and the clamp resolves to MIN — always legacy `vh`, the exact value
the house `h-dvh` rule exists to avoid. Direction: `clamp(svh, vh, dvh)` or just
emit `dvh`.

**M12 — `lib/env.ts` lacks a server-environment guard** — `lib/env.ts:88` vs `lib/integrations/registry.ts:206-227` — PLAUSIBLE (mechanism proven; all 14 current importers traced server-side). [boundary]
Module-scope `envSchema.safeParse(process.env)` with every field `.optional()`
means a future client-reachable import doesn't throw — it silently yields
`{}`, quieter than the 08-02 H1 failure the guard class was built to convert
into a loud one. Named unresolved in that audit's design tension 1; this is the
broadest module sharing the anti-pattern. Direction: add the same runtime guard,
or centralize it where both modules get it.

**M13 — `ProgressText` keeps stale detached-node refs** — `components/effects/progress-text/index.tsx:86-93,116-119` — CONFIRMED. [correctness]
The word-span ref callback never clears its slot on unmount, so when `children`
shrinks the array keeps detached nodes at its old length and every surviving
word's reveal threshold (denominator `wordsRefs.current.length`) silently
shifts. The identical bug class was fixed in `marquee` during the 07-09
remediation; the fix was never applied here. Direction: mirror marquee's
null-the-slot fix.

### Low

**L1** — `lib/integrations/shopify/index.ts:26` example passes a nonexistent
`variants` prop to `AddToCart`; the README one file away has the correct shape.
Copy-pasting the header example fails typecheck. CONFIRMED. [documentation]

**L2** — `AddToCart`'s submit button (`cart/add-to-cart/index.tsx:64-71`) lacks
the `useFormStatus().pending` guard both sibling cart buttons already use;
rapid double-tap fires the action twice and feeds the still-open concurrent
`createCart` race (07-09 M7). CONFIRMED. [correctness]

**L3** — the `example` Sanity schema (~200 lines, registered in the live Studio)
has zero queries and zero routes: editors can author documents that render
nowhere, and the README's "Creating New Content Types" tutorial holds it up as
the model to copy. CONFIRMED. [incoherence]

**L4** — `sanity/README.md:39-44` says the Marketplace provisions
`NEXT_PUBLIC_SANITY_PROJECT_ID` directly, while `lib/env.ts:48` calls
`SANITY_STUDIO_PROJECT_ID` the "Vercel Marketplace… Studio convention" — the two
disagree on which provisioning path the alias serves, which is how H4 stayed
hidden. CONFIRMED. [documentation]

**L5** — `buildHooksSection` (`generate-manifest.ts:214-264`) globs
`lib/hooks/*.ts` without the `.test.ts`/`.d.ts` filter `buildUtilsSection` has;
the first co-located hook test bakes garbage rows into COMPONENTS.md or fails
`manifest:check` confusingly. CONFIRMED (dormant — no such file today). [correctness]

**L6** — `doctor.ts:122-126` checks `existsSync('.git/hooks/pre-commit')`, which
can never pass in a linked worktree (`.git` is a file), and its fix text
(`bunx lefthook install`) is the exact command `prepare.ts:154-173` deliberately
skips there. CONFIRMED. [DX]

**L7** — the Orchestra 🧊 toggle persists a `webgl` key nothing reads
(`lib/dev/index.tsx:44` doesn't destructure it); `lib/dev/README.md:14` documents
it as "Global WebGL canvas (on by default)". CONFIRMED. [affordance]

**L8** — `isEmptyArray`'s JSDoc example claims `isEmptyArray('test') // true`;
the implementation and its test agree it returns `false`. CONFIRMED. [documentation]

**L9** — `parseFormData` (`validation.ts:182-185`) overwrites repeated FormData
keys last-wins with no array support and no documented caveat; a future checkbox
group backed by this helper silently loses values. PLAUSIBLE (dormant — no
array-typed schema today). [missing functionality]

**L10** — `articleSchema`/`breadcrumbSchema` (`lib/seo/schemas.ts:55-93`) and
`articleQuery` are exported with zero callers — the same root cause as H2 (the
article type is modeled end-to-end, rendered nowhere). CONFIRMED. [dead code]

**L11** — `getCmsRoutes` validates with `z.array(...).safeParse` and returns `[]`
on any failure (`lib/seo/routes.ts:110-111`): one malformed document empties the
entire CMS sitemap/llms.txt set instead of skipping the entry. Codex-found,
verified. CONFIRMED mechanism (dormant — the GROQ projection controls the shape
today). [correctness]

### Info

**I1** — the 08-02 open question on `shopify/client.ts` client-safety is
narrowed, not closed: `assertServerEnvironment()` (via `isConfigured('shopify')`
at `client.ts:50`) makes client-side _calls_ throw loudly, but the module-scope
env reads at `client.ts:30-31` run outside the guard on import. Verified no
secret exposure is possible (all env fields `.optional()`; the token isn't
`NEXT_PUBLIC_`-prefixed so it is never inlined). The structural question — a
static boundary marker — remains open.

## 4. Design tensions

1. **Config truth is split three ways, and dual compilation splits it further.**
   `lib/env.ts`, `lib/integrations/sanity/env.ts`, and `lib/utils/validation.ts`
   each answer "is X configured" from different inputs with different alias
   handling — H3, H4, M12, and L4 are one fault line. Worse, "read from the same
   module" is not a fix on its own: a dual-compiled module gives different
   answers per side when its fallbacks aren't statically inlinable (H4).
   Alternative worth weighing: one schema module per integration, consumed by
   both `env` and the registry, with client-reachable modules restricted to
   literal `NEXT_PUBLIC_*` member expressions and everything else behind the
   server guard.
2. **"Deliberate" comments record intent, never cost.** H1's ordering and H3's
   "published fetching is unaffected" are both documented decisions whose
   consequences were never traced. A decision comment that doesn't state what it
   trades away invites exactly these escalations.
3. **The CMS models more than the app renders.** `page`, `article`, and `example`
   are modeled end-to-end — schema, queries, URL resolver, sitemap enumeration,
   JSON-LD builders — with no render path (H2, L3, L10). Either ship the
   `[[...slug]]` render path or prune the model to what the starter actually
   serves; the half-state is the worst of both.
4. **The scaffold pipeline has three failure modes and one contract.** Throw
   (`RequiredOpMatchError`), collect (`TransformFailure[]`), and skip
   (missing file) behave completely differently downstream (H5, H6, M5, M6).
   One explicit failure contract — anything unexpected blocks selfPrune — would
   collapse the class.
5. **Claims outrun fixes.** The process-audit ledger and CHANGELOG credit #370
   with more than it shipped (H7); `applyOverwriteFiles`' JSDoc describes dead
   behavior (M6); `lib/dev/README.md` documents an inert toggle (L7); two
   team-knowledge notes are stale (below). Remediation PRs must update the claim
   surface — CHANGELOG, ledger, README, JSDoc — in the same diff, or the next
   audit spends its budget re-disproving the record.

## 5. Open questions (maintainer input required)

1. **Article/page routing intent** — is the `[[...slug]]` catch-all the plan, or
   should `getCmsRoutes()` + the `link` schema + the Presentation mapping stop
   advertising types that don't render (H2/L3/L10 hinge on this)?
2. **Should the `(examples)` group survive `setup:project` at all?** If it's
   demo-only, pruning it at scaffold time makes M8 moot for client projects.
3. **Turnstile-vs-rate-limit ordering** — the in-code comment says deliberate;
   the traced consequence says revisit (H1). Which wins?
4. **Two stale team-knowledge notes** — `satus-components-manifest-ci-only-check`
   predates #283 (manifest:check has been in local `bun run check` since; the
   note's core warning is obsolete), and `scaffolder-integration-logic-lives-in-starter`
   still references `satus add` payload pinning, deleted in #277. Both need an
   update or retirement in the team-knowledge repo.

## 6. Still open from prior audits (re-verified this pass, not re-litigated)

form-hook required-field unmount wedge (07-09 H6 — see also this report's M13
sibling-class) · concurrent `createCart` race (07-09 M7) · no Turnstile on
Shopify customer auth (07-09 H4) · webhook secret compared non-constant-time
(07-09 M2) · draft-mode enable missing empty-token check (07-08 M1) · Mailchimp
hardcodes `status: 'subscribed'` vs README's double-opt-in claim (07-09 M12) ·
theme FOUC (07-09 M4) · checkbox hidden-input dead `onChange` wiring (07-09 L7) ·
scrollbar keyboard/ARIA inoperability (07-09 L4) · non-passive pointer listeners
(07-09 L10).

## 7. Considered & rejected (consolidated ledger — check before re-hunting)

- **Codex claim: stale `subtotalAmount` on emptying the cart** — rejected;
  prior-audit L19, still inert (EmptyCart hides the totals block).
- **Original H4 scenario "working /studio, blank frontend"** — corrected, not
  rejected: alias-only config breaks /studio too (hydration 404); the finding
  stands with the sharper scenario.
- **07-09 H1 (tarball ref injection) / H2 (`--keep` requires)** — moot; `satus
add` and the tarball fetch path were deleted wholesale in #277.
- **`--keep sanity,sanity` duplication (07-09 L16)** — disproved;
  `resolveTransitiveKeepSet` collapses duplicates.
- **`CACHE_COMPONENTS_DISABLE_TRANSFORM` no-op on missing property** — folded
  into the H5 theme; all three target properties statically present today and
  the result is re-verified after write.
- **Concurrency lock engaging on `--dry-run`** — conservative-but-correct.
- **`guardProjectRoot` false-passing post-prune** — irrelevant; the stub
  short-circuits before this file runs.
- **`asKindOrThrow` throwing on non-required ops** — every call is guarded by a
  `getKind()` check first.
- **Rate-limit off-by-one** — traced request-by-request for limit=5; exact.
- **Contrast-checker silent skip on renamed derived tokens** — the test pins the
  exact token list; fails loudly first.
- **GSAP `lagSmoothing(0)` + absolute Tempus time as a fluid-sim-H3 sibling** —
  GSAP derives its own deltas with no feedback loop; tab-resume advances tweens,
  doesn't corrupt state. Not filed.
- **Worker-src CSP gap** — consistent with the in-code audit comment; no
  `Worker()` usage found in the files read.
- **Draft-mode disable `Sec-Fetch-Site` bypass** — tradeoff self-documented;
  worst case is an unwanted redirect.
- **Page-generator underscore names / case-variant collisions / page named
  `api`** — all traced to valid or non-colliding outcomes.
- **Dead `webgl` branch in `generate-manifest.ts:193`** — confirmed unreachable,
  currently harmless; noted, not filed.
- **`generatePageMetadata` alternates replacement dropping the llms.txt hint on
  `/sanity`** — plausible per Next's shallow metadata merge, not browser-verified
  this pass; blast radius one link tag on a demo page. Follow-up, not a finding.
- **`check-assets.ts` hardcoded scan roots** — correct for this repo today;
  fork-owner-tunable design choice.

### Prior fixes re-verified as holding (regression sweep)

fluid-sim dt clamp · reduced-motion WebGL gate · `simTypes` opt-in plumb-through ·
dual-root-canvas real no-op guard · CSP compose (`default-src 'self'`,
`object-src 'none'`, registry-derived origins) · storybook proxy fail-closed
off-Vercel · CI `bun-version-file` pinning · manifest:check in local `check` ·
e2e in CI with fail-open path gate · shopify cart error surfacing (07-09 M6) ·
`shopifyFetch` status branching (M9) · SanityLive empty-token gate (07-09 M11 —
but see H3 for its sharp edge) · 08-02 Studio gate trio (H1/M1/M2) ·
`isExternalHref` unification · Select label association · checkbox `useId` ·
Image CLS union · toast viewport fallback · raf HMR guard · form Enter/click
gate parity (07-09 H10).

## 8. Cross-model pass (Codex)

Whole-repo blind ask timed out at 10m; re-run as a bounded verify on the
assembled finding list per the audit contract. Results: 9/10 CONFIRM (H1, H2,
H5, H6, H7, H8a, M1, M2, M10a) — treated as high-conviction convergence; 1
refutation of H4's _scenario_ (adopted after independent re-verification of
`sanity/env.ts` + the dual-compile inlining behavior); 5 additional candidates,
of which 3 adopted after independent verification (H3, H8b, M10b), 1 adopted as
L11, 1 rejected against the prior ledger (see §7). Divergences are recorded, not
dropped.

## 9. Verified sound (beyond the regression sweep)

`revalidate` route (HMAC via `parseBody`, 400 on malformed JSON, rate-limited
before parsing) · hubspot/mailchimp Zod boundaries with per-provider
`fetchWithTimeout` budgets · turnstile fail-closed-in-prod / fail-open-in-dev ·
`rateLimit()` window math · `fetchWithTimeout` AbortController composition
(tested against a real server) · proxy tripwire test · sitemap/llms.txt shared
source-of-truth with `home`-slug dedup and graceful `[]` on fetch failure ·
scaffold concurrency lock (atomic mkdir, stale-PID, signal release) ·
`resolveTransitiveKeepSet` + create-darkroom contract tests · byte-exact
idempotent overwrites · `PENDING_FORMAT_MARKER` flow · style drift-guard test
trio (palette byte-compare, stray-color scan, cascade-layer contract) · GPU
resource disposal across fluid/flowmap/postprocessing · tunnel context bridging ·
JSON-LD `<` escaping · SanityImage prop narrowing.

## 10. Post-publication corrections

This section exists because design tension 5 (claims outrun fixes) applies to
this report too.

**The draft-mode surface listed in §9 was not sound.** Hours after this audit
was written, #372 fixed a real defect in it: the "Disable Draft Mode" pill used
the prefetching `Link` primitive, so the router's speculative fetch of
`/api/draft-mode/disable` executed the route handler and deleted the draft
cookies out from under an open Presentation preview. The audit's CMS pass read
that route (it cleared the `Sec-Fetch-Site` cross-site guard as a documented
tradeoff) and did not consider that route handlers run on prefetches at all.

The miss is instructive: every auditor asked "what does this code do when
called?" and none asked "who else can call it, and when?" — the affordance
category was applied to APIs and component props but not to route handlers as
speculatively-invoked endpoints. Worth carrying into the next pass.

Fixed in #372: the route answers prefetch/RSC fetches with 204, the pill renders
only in a conclusively standalone context, and it is a plain anchor.
