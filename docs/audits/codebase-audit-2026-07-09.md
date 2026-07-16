# Adversarial Codebase Audit — 2026-07-09

Second-pass whole-repo honesty audit of satus (`main`, Next.js 16.2.10 / React 19.2.7 / Tailwind v4). Six area readers covered the codebase in full (setup/scaffolding CLI, security surfaces, integrations, webgl/animation, UI components + hooks, config/CI/docs). Every finding below survived an independent disprove pass, and all 6 net-new highs plus 7 key mediums were cross-verified by Codex (see §7).

This audit runs one day after [`codebase-audit-2026-07-08.md`](./codebase-audit-2026-07-08.md), which logged 42 findings. Substantial remediation landed in between. So this report is structured as: **(§0) remediation delta on yesterday's findings**, then **net-new findings** (the bulk), then the usual tensions / open questions / rejected ledger. Yesterday's §6 rejected-ledger was consulted before hunting; where it already ruled on something (notably the in-memory rate limiter for the Vercel target), today's finding is reclassified rather than re-filed.

**Net-new totals: 6 high · 23 medium · 20 low.** CONFIRMED = traced end-to-end (H1 additionally reproduced-by-reading at the source); PLAUSIBLE = mechanism verified, trigger not run live.

---

## 0. Remediation delta since 2026-07-08

Verified against current code by this pass's readers (only findings whose code was re-touched are claimed; the rest are "not re-checked this pass").

| Prior ID | Prior issue | Current state |
|---|---|---|
| H1 | Shopify endpoint built without `https://` scheme | **FIXED** — `client.ts` normalizes the scheme |
| H2 | Shopify webhook revalidation wired to no route | **FIXED** — `app/api/revalidate/route.ts` now dispatches to `shopifyRevalidate` |
| H9 | `<Image>` fake 1×1 defaults → CLS | **FIXED** — now a discriminated `ImageSizingProps` union enforcing an honest layout box; no dimensionless fallback |
| M2 | Shopify `dataSchema` payload validation opt-in, zero callers | **FIXED** — every Shopify call site now passes `dataSchema` |
| M3 | No Turnstile on HubSpot newsletter action | **FIXED** — `HubspotNewsletterAction` now calls `validateFormWithTurnstile` first |
| M8 | Local/CI gates disagree (manifest sub-gap) | **FIXED but overshot** — `check` now includes `manifest:check`; CI still runs it a second time (new finding **L1**) |
| L7 | Marquee stale refs on shrink | **FIXED** — ref callback nulls the detached slot; comment explains why |
| M1 | Draft-mode gate checks `isConfigured` not `privateToken` | **STILL OPEN** — same root cause also surfaces in `SanityLive` (new finding **M11**) |
| H11 | `@theatre/core` runtime imported into every WebGL page, provider mounted nowhere | **STILL OPEN** — `SheetProvider` still wraps every canvas; `useTheatre` still called unconditionally by both sims. `lib/dev/README.md:40` ("production excludes all dev tools") overstates this (new finding **M14**-adjacent note) |
| M19 | No runtime guard against two root canvases | **PARTIALLY FIXED** — a guard was added but only `console.warn`s in development; production still silently doubles GPU cost (new finding **M13**) |
| M14 | `WebGLImage` never disposes previous texture on `src` change | **RECLASSIFIED to by-design** — disposing the shared `useTexture`-cached texture would corrupt other consumers reading the same URL; the code correctly does *not* dispose it. Bounded drei-cache growth remains, now with an accurate explanatory comment |
| H4 | SECURITY.md CodeQL claim | Already marked DISPROVED in the prior file (default-setup CodeQL is real, invisible to workflow-tree inspection) |
| M13 | `preload` prop docs | Already reclassified in the prior file (`preload` IS Next 16's native LCP mechanism; docs-only) |

Everything else in yesterday's list was not re-touched this pass; no claim is made about its status.

---

## 1. Summary table (net-new)

| ID | Sev | Area | Issue | Location | Status |
|---|---|---|---|---|---|
| H1 | high | scripts/supply-chain | Unsanitized git `ref` concatenated into codeload URL — `../`-laden ref redirects the tarball fetch to an arbitrary repo, then installs it | `lib/scripts/payload-source.ts:45,97,101` | CONFIRMED |
| H2 | high | scripts | `setup:project` ignores bundle `requires` transitivity — `--keep theatre` strips webgl then re-adds theatre files as orphans; build breaks, exit 0 "Setup complete!" | `lib/scripts/setup-project.ts` (`resolveKeepFromFlags`, `:569`) | CONFIRMED |
| H3 | high | webgl | No frame-delta clamp in Tempus→R3F→fluid-sim; `gsap.ticker.lagSmoothing(0)` disables GSAP's own guard — a backgrounded→foreground tab feeds multi-second dt into a GPU feedback loop, permanently corrupting the sim until reload | `lib/webgl/utils/fluid/fluid-sim.ts:130,221`, `components/effects/gsap.tsx:26` | CONFIRMED |
| H4 | high | security | No Turnstile on Shopify `LoginCustomerAction`/`CreateCustomerAction`, unlike every other mutating form action — credential-stuffing gate missing on the auth path | `lib/integrations/shopify/customer/actions.ts:42-90,118-157` | CONFIRMED (latent — no UI consumer yet) |
| H5 | high | security | CSP sets only `frame-ancestors`; no `script-src`/`default-src`/`object-src`/`base-uri` — zero script-injection backstop on a site loading GA/GTM/HubSpot/Meta via next/script | `next.config.ts:131-169` | CONFIRMED |
| H6 | high | components | Form `register` never deletes state-map entries on unmount — a required field mounted once then removed leaves `isValid[name]=false` forever, form never submittable again | `components/ui/form/hook.ts:151-159,91-94` | CONFIRMED |
| M1 | med | scripts | Self-prune (deletes setup-project.ts) runs before AST-transform failures are evaluated, contradicting the file's own "failures leave the script intact to re-run" docstring | `lib/scripts/setup-project.ts:844-850` | CONFIRMED |
| M2 | med | security | Shopify webhook auth is a static `?secret=` compared with `!==` (not constant-time), body unauthenticated, no replay protection — unlike the Sanity HMAC path in the same route | `lib/integrations/shopify/revalidate.ts:25-32` | CONFIRMED |
| M3 | med | webgl | `prefers-reduced-motion` detected but never consulted by the WebGL mount gate or either sim, despite `AGENTS.md:104` + `global.css:144` claiming it gates itself | `lib/webgl/components/canvas/index.tsx:74-88` | CONFIRMED |
| M4 | med | components | Theme resolved only in post-hydration `useEffect`; `app/error.tsx` (theme="light") and any non-dark page render black then flip to white — full FOUC flash | `components/layout/theme/index.tsx:71-75`, `app/layout.tsx:90-99` | CONFIRMED |
| M5 | med | components | Toast wrapper renders nothing: Base UI `Toast.Viewport` needs a `toasts.map(<Toast.Root>)` child, but the wrapper's own example is self-closing and no story shows the step | `components/ui/toast/index.tsx` | CONFIRMED |
| M6 | med | shopify | Cart mutation `CartActionResult.error` is discarded at every call site; `router.refresh()` silently re-bases the optimistic cart — a failed add looks identical to a lost sale, no signal | `cart/add-to-cart/index.tsx:38-51`, `cart/modal/index.tsx:180-238` | CONFIRMED |
| M7 | med | shopify | Concurrent `addItem` with no cart cookie: both invocations `createCart()` and set the cookie, last wins — the other cart's line is orphaned in Shopify | `lib/integrations/shopify/cart/actions.ts:136-166` | CONFIRMED (mechanism) |
| M8 | med | shopify | `getMenu()` strips paths via `.replace(SHOPIFY_STORE_DOMAIN,'')`, but Storefront menu URLs use the shop's primary (custom) domain — on real storefronts the replace is a no-op, links come back absolute | `lib/integrations/shopify/pages.ts:17,34-42` | CONFIRMED (dormant, zero callers) |
| M9 | med | shopify | `shopifyFetch` never checks `result.ok` before `.json()` and has no retry/backoff — a 401 (bad token) or 429 (throttle) both surface as a generic envelope-parse error, no resilience | `lib/integrations/shopify/client.ts:66-77` | CONFIRMED |
| M10 | med | hubspot | Two `<EmbedHubspotForm>` on one page: Next dedupes `<Script id="hubspotScript">`, dropping the second instance's `onLoad`; second form may never render | `lib/integrations/hubspot/embed/index.tsx:17,36,55-65` | PLAUSIBLE |
| M11 | med | sanity | `isConfigured('sanity')` requires no token (Shopify requires one); `SanityLive` renders and connects with empty-string tokens instead of failing clearly — second instance of prior M1's root cause | `lib/integrations/sanity/live/index.tsx:12-20`, `validation.ts` | CONFIRMED |
| M12 | med | mailchimp | README claims "double opt-in (GDPR compliant)" but `upsertMember` hardcodes `status:'subscribed'`/`status_if_new:'subscribed'` — compliance depends entirely on external list config the docs never state | `lib/integrations/mailchimp/mailchimp-client.ts:135-143` | CONFIRMED (code) |
| M13 | med | webgl | Double-root-canvas guard only `console.warn`s and only in development — production silently runs two WebGLRenderers, doubling GPU cost | `lib/webgl/store.ts:36-53` | CONFIRMED |
| M14 | med | webgl | No `webglcontextlost`/`restored` handling anywhere — GPU reset or mobile context-budget eviction leaves the canvas permanently blank with no recovery | repo-wide (absence) | CONFIRMED |
| M15 | med | config | `NEXT_PUBLIC_STORYBOOK_URL` read raw in two sites but absent from `lib/env.ts`'s schema — the one env var with no single source of truth; typo it and the proxy silently stays off | `next.config.ts:10`, `header/index.tsx:25`, `lib/env.ts:19-62` | CONFIRMED |
| M16 | med | config | `SANITY_REVALIDATE_SECRET` read via raw `process.env` although declared in `lib/env.ts:38`; violates AGENTS.md:426 and contradicts CHANGELOG.md:51's own "routed through @/lib/env" remediation claim | `app/api/revalidate/route.ts:34` | CONFIRMED |
| M17 | med | docs | AGENTS.md instructs both "gate debug UI with `process.env.NODE_ENV`" (:133) and "never use process.env directly" (:426) with no cross-reference — 9 of 18 raw-env sites follow one rule while violating the other | `AGENTS.md:133` vs `:426` | CONFIRMED |
| M18 | med | docs/dx | `SANITY_REVALIDATE_SECRET` — required for webhook revalidation to do anything (503 without it) — documented nowhere in the Sanity integration README a newcomer reads | `lib/integrations/sanity/README.md` | CONFIRMED |
| M19 | med | security | `STORYBOOK_PROXY_ENABLED` gates on `VERCEL_ENV !== 'production'`, which is `undefined` off Vercel → fails **open**; a self-hosted prod with the var set exposes `/storybook` | `next.config.ts:10-12` | PLAUSIBLE |
| M20 | med | security | `NEXT_PUBLIC_SANITY_API_READ_TOKEN` ships to the browser as the Live `browserToken` by design; nothing enforces it's viewer-only, and the marketplace fallback chain makes a write token easy to misplace here | `lib/env.ts:27-30`, `sanity/live/index.tsx:14-19` | PLAUSIBLE |
| M21 | med | scripts | `--dry-run` reads live on-disk package.json for dep diffing, so kept-integration deps report as "0 added" — misleading preview (real apply is fine) | `setup-project.ts:818-824`, `bundle-installer.ts:154-159` | CONFIRMED |
| M22 | med | components/a11y | `Select`'s `label` prop renders a bare `<span>`, not `<label htmlFor>`/`aria-labelledby` — screen readers get the value, not the field name | `components/ui/select/index.tsx:124-129` | CONFIRMED |
| M23 | med | shopify | Customer-auth subsystem has zero UI consumers (intentional per `.react-doctor/false-positives.md`) but the README lists "Customer authentication" as a Feature unqualified; `getCustomerQuery` also over-fetches `phone`/`addresses`/`orders` that `customerSchema` strips | `shopify/queries/customer.ts:9-20`, `shopify/README.md:67` | CONFIRMED |
| L1 | low | ci | `manifest:check` runs twice per CI job (once inside `check`, once as its own step) after the M8 fix wasn't cleaned up | `package.json:16`, `ci.yml:30-35` | CONFIRMED |
| L2 | low | components | Hardcoded `id="hidden"` on every `CheckboxesField` — two on one form = duplicate DOM ids (invalid HTML) | `components/ui/form/fields/index.tsx:188` | CONFIRMED |
| L3 | low | components/security | `Link` classifies only `http(s)` as external; `javascript:`/`data:` hrefs pass through to `NextLink` unguarded — latent when a fork feeds it CMS-authored links (same class as sanity `utils/link.ts:20-22`) | `components/ui/link/index.tsx` | PLAUSIBLE |
| L4 | low | components/a11y | Custom scrollbar thumb has no `role="scrollbar"`, no aria-value*, no `tabIndex`, no arrow keys — keyboard-inoperable | `components/ui/scrollbar/index.tsx` | CONFIRMED |
| L5 | low | hooks | `usePrefetch`'s `prefetchedRef` never resets when `href` changes — a recycled/paginated instance stops prefetching after its first target | `lib/hooks/use-prefetch.ts:32,55` | PLAUSIBLE |
| L6 | low | components/dx | `zodToValidator` collapses `safeParse` to a boolean, discarding Zod's specific messages; client always shows generic `Invalid {field}` while server surfaces the real message | `components/ui/form/hook.ts:196-199`, `validation.ts:9-14` | PLAUSIBLE |
| L7 | low | components | `CheckboxesField`'s hidden input wires `register`'s `onChange` but is driven by React state, so the handler never fires — inert boilerplate that looks functional | `components/ui/form/fields/index.tsx:180-191` | PLAUSIBLE |
| L8 | low | webgl | `Program` class has zero importers repo-wide — dead code, no `dispose()` if revived | `lib/webgl/utils/program.ts` | CONFIRMED |
| L9 | low | dev | Studio "save config" `URL.createObjectURL` never revoked (dev-only, click-triggered) | `lib/dev/theatre/studio/index.tsx:47` | CONFIRMED |
| L10 | low | webgl/perf | Pointer listeners use `addEventListener(..., false)` (useCapture) not `{ passive: true }` | `lib/webgl/hooks/use-pointer-input.ts:56-57` | PLAUSIBLE |
| L11 | low | docs | AGENTS.md stack table says "TypeScript 5" — actual is `typescript@6` (classic) + `typescript7` (native gate) | `AGENTS.md:13` | CONFIRMED |
| L12 | low | dx | `doctor.config.json` (configures third-party `react-doctor`) collides in name with `bun run doctor` (first-party `lib/scripts/doctor.ts`) | repo root | CONFIRMED |
| L13 | low | config | Three parallel env-access paths (`lib/env.ts`, `sanity/env.ts` raw reads, `coreEnvSchema`) with overlapping vars that can silently diverge | `lib/env.ts` vs `sanity/env.ts` vs `validation.ts:127-133` | CONFIRMED |
| L14 | low | docs | Sanity README claims "env vars validated with Zod" and lists `NEXT_PUBLIC_SANITY_API_VERSION`, but that var is absent from `lib/env.ts` and read raw with a different default | `sanity/README.md:17,24` | CONFIRMED |
| L15 | low | scripts | Summary-line `getBundle(k)?.name` assumes every kept id has a bundle; bundle-less ids (`turnstile`/`analytics`) would print literal `undefined` if reached via a preset | `setup-project.ts` (summary `.join()`) | PLAUSIBLE |
| L16 | low | scripts | `--keep sanity,sanity` isn't de-duplicated (harmless, wasteful) | `setup-project.ts` | CONFIRMED |
| L17 | low | scripts | `satus add --dry-run` still performs a real network fetch + tar extraction before the dry-run branch | `satus.ts` / `payload-source.ts` | CONFIRMED |
| L18 | low | scripts | `copyBundleFiles`'s `--force` has no content-comparison guard, unlike `applyOverwriteFiles`'s match-or-warn | `bundle-installer.ts` | CONFIRMED |
| L19 | low | shopify | Removing the last cart line zeroes `totalAmount` but leaves stale `subtotalAmount`/`totalTaxAmount` — inert today (EmptyCart hides them), visible the moment a persistent subtotal badge is added | `cart/optimistic-utils.ts:69-79` | CONFIRMED |
| L20 | low | shopify | Optimistic cart totals use float `Number()` money math — cosmetic-only (Shopify is authoritative at checkout) but uncommented | `cart/optimistic-utils.ts:150,177-178` | CONFIRMED |

---

## 2. System map (current state)

**Entry points.** `app/layout.tsx` (Wrapper → Header/Footer/Lenis; optional shared root Canvas via `lib/features`; conditional Sanity Live/VisualEditing), `app/page.tsx` (the one manual landing page a fork replaces), three API routes (`draft-mode/enable|disable`, `revalidate` — now dual Sanity+Shopify), `proxy.ts` (rate-limits `/api/*`). CLI: `setup:project` (destructive, self-pruning, 13 steps), `satus add` (additive inverse, GitHub-tarball registry), `dev`, `doctor`, `generate*`, `handoff`, manifest generation.

**Real execution paths that differ from documented ones:**
- `setup:project --keep <transitive-dep>` diverges from `satus add`: the latter resolves `requires`, the former doesn't (H2). The two "install a bundle" graphs disagree on whether `requires` is load-bearing.
- Payload resolution trusts `ref` end-to-end: `--ref`/`satus.ref` flow unsanitized into a codeload URL whose host can be redirected (H1).
- The WebGL frame loop is a single unified Tempus clock (verified sound) but with no dt ceiling, so one suspended-tab gap corrupts the fluid sim (H3).
- Reduced-motion is detected and documented as gating WebGL, but no WebGL code reads it (M3).

**Key invariants and where they hold / break:**
- "Validate at the boundary" now holds for Shopify payloads (prior M2 fixed) but `isConfigured` still means different things per integration — Shopify needs a token, Sanity doesn't (M11).
- "Fail fast, mutate never" holds at arg-parse but not mid-run: self-prune fires before AST failures are checked (M1).
- "One root canvas" is now guarded, but only with a dev-only warning (M13).
- `lib/env.ts` is documented as the single validated source of truth, but three parallel env paths exist (L13) and two documented vars never reach the schema (M15, L14).

**Expectation gaps (expected X, found Y):**
- Expected `--keep theatre` to keep a working project → orphaned webgl files, broken build, exit 0 (H2)
- Expected `useToast().toast()` to show a toast → nothing renders (M5)
- Expected an optional/conditional form field to not wedge the form → a removed required field wedges it forever (H6)
- Expected reduced-motion to quiet the WebGL background → it runs regardless (M3)
- Expected `getMenu()` to return internal paths → absolute custom-domain URLs (M8)
- Expected the CSP header to constrain scripts → it constrains only framing (H5)

---

## 3. Findings by hunt category

Severity order; full prose for highs, table above covers the rest.

### Correctness

**H3 — Unclamped frame-delta corrupts the fluid sim.** Tempus's `Clock.update()` computes `deltaTime` with no cap; R3F's `advance()` under `frameloop="never"` computes `delta = timestamp - clock.elapsedTime`, also uncapped; that raw value flows into `fluid.update(delta)` and multiplies into the advection (`fluid-sim.ts:130`) and vorticity (`:221`) math. The sim is a GPU feedback loop sampling the previous frame's HalfFloat target with no NaN/finite guard, so a single multi-second frame (backgrounded mobile-Safari tab, then foreground) can permanently corrupt state until a hard reload. `gsap.ticker.lagSmoothing(0)` (`gsap.tsx:26`) turns off GSAP's own defense on the assumption Tempus supplies safe timing, which it doesn't. Codex AGREE. *Direction: clamp once at the shared choke point — `RAF`'s `advance(Math.min(time/1000, cap))` and/or inside Tempus's clock — not per consumer.*

**H6 — Form `register` leaks unmounted field state, wedging submit.** The ref callback adds to `isValid`/`isActive`/`errors` on mount (`isNewRegistration` guard) but on unmount only nulls `inputsRefs.current[name]`; the three state maps keep the entry. `isReady = Object.values(isValid).every(Boolean)`, so a required field that mounts once then is permanently removed (conditional reveal, multi-step, tab swap) holds `isValid[name]=false` forever and the form can never become ready again. The test suite covers reorder and optional-field unmount but never a *required* field's permanent removal, so the gap wasn't caught. Codex AGREE. *Direction: on unmount, delete the field's entries from all three maps, not just the DOM ref.*

Also here: M1 (self-prune before failure check), M7 (concurrent cart create), M11 (Sanity live with empty tokens), L5/L7/L19/L20.

### Alternative / unintended paths

**H2 — `setup:project` ignores `requires` transitivity.** `resolveKeepFromFlags` and the interactive multiselect return exactly the selected ids without resolving `IntegrationBundle.requires` (the multiselect shows only `description`, never `requires`). `satus add` gets this right via `resolveAddSet` (tested for `theatre → webgl`). Running `bun run setup:project --keep theatre --yes` passes preflight (webgl still exists pre-strip), strips all bundles including `lib/webgl`, then re-adds only theatre — including four `overwriteFiles` that live *inside* `lib/webgl/*`, restored as orphans importing into a deleted tree. `components/layout/wrapper/index.tsx` stays webgl-free. Build fails; `setup()` returns normally with "Setup complete!" and no warning. The `:569` comment ("respecting requires transitivity is not needed here — the snapshot already has all files") is only true for callers that already included transitive deps, which built-in presets do but `--keep`/custom-select don't. Codex AGREE. *Direction: run `resolveAddSet`-equivalent transitive expansion on the kept set before stripping, or reject a `--keep` set that isn't `requires`-closed.*

Also: M6 (swallowed cart errors), M9 (no Shopify status branch/retry), M10 (duplicate HubSpot form), M21 (dry-run dep under-report), M19 (Storybook fail-open), L17.

### Incoherences

**H1 is filed under Boundary/safety below** but is also the deepest incoherence: two definitions of trust for `ref`. Beyond it: M11 (per-integration `isConfigured` semantics), M15/L13/L14 (env source-of-truth drift), M16 (raw env vs the typed accessor the changelog says it moved to), M17 (AGENTS.md contradicting itself), L1 (manifest check duplicated), L12 (doctor naming collision).

### Affordance mismatches

**M5 — Toast wrapper renders nothing as documented.** Base UI `Toast.Viewport` does not auto-render active toasts; the only supported pattern is a consumer-supplied `toasts.map(t => <Toast.Root toast={t}>)` child. The satus wrapper exports `Root`/`Title`/`Description`/`Close` but its own usage example is `<Toast.Viewport />` self-closing, and there's no `toast.stories.tsx` (every other primitive has one). `useToast().toast('Saved!')` updates Base UI state, but with no `Toast.Root` rendered, nothing appears. It's currently *more* confusing than importing Base UI directly, because the wrapper's docs imply it works standalone. Codex AGREE. *Direction: bake the `toasts.map` loop into `Toast.Viewport` so the self-closing form is genuinely usable, or fix the JSDoc and add a story.*

Also: H2 (above), M8 (getMenu), M22 (select label), M23 (customer-auth feature framing).

### Missing functionality

M3 (reduced-motion never consulted), M14 (no WebGL context-loss recovery), M9 (no retry/backoff), M18 (undocumented required secret), L4 (scrollbar keyboard a11y), L6 (Zod messages dropped).

### Boundary and safety

**H1 — Unsanitized `ref` redirects the payload tarball to an arbitrary repo.** `tarballUrl = ref => \`${REPO_TARBALL_BASE}${ref}\`` (`payload-source.ts:45`) concatenates `ref` onto `https://codeload.github.com/darkroomengineering/satus/tar.gz/`; `pickRef` (`:48-55`) applies no validation; `fetch(tarballUrl(ref))` (`:101`) downloads it. WHATWG URL normalization collapses `../` segments, so `ref = ../../../evilowner/evilrepo/tar.gz/main` resolves to `https://codeload.github.com/evilowner/evilrepo/tar.gz/main` — an arbitrary repo's tarball, extracted and its declared bundle files copied into the project, then `bun install`ed with no integrity check. **Codex NUANCE, folded in:** extraction is to a temp dir and only the requested bundle's files are copied (not the whole repo), and `--ref` is one-shot (not persisted). The durable vector is a poisoned `satus.ref` in a committed `package.json`, which `readPinnedRef` trusts on every future `satus add`; the malicious tarball's own `package.json` can also pin a hostile dependency version that `bun install` then pulls. The `tar` spawn is array-form (no shell/command injection — verified). *Direction: validate `ref` against an allowlist pattern (`^[\w.\-/]+$` with no `..` segments) before URL construction, and/or pin to `github.com/darkroomengineering/satus` by constructing the URL from separate owner/repo constants the ref can't escape.*

**H5 — CSP has no script-injection backstop.** `next.config.ts:131-169` sets only `frame-ancestors 'self' https://*.sanity.studio` (redundant with the `X-Frame-Options` header already present). No `default-src`/`script-src`/`object-src`/`base-uri`. On a starter that loads HubSpot, Mailchimp, GA, GTM, and the Meta pixel via next/script and is the baseline for client storefronts, the app relies entirely on "no `dangerouslySetInnerHTML` today" holding forever, with no CSP to contain a future regression or a third-party compromise. Codex AGREE. *Direction: add `default-src 'self'; script-src 'self' <the actual third-party origins>; object-src 'none'; base-uri 'self';`, ideally nonce-based rather than `'unsafe-inline'`.*

**H4 — No CAPTCHA on Shopify customer auth.** `LoginCustomerAction`/`CreateCustomerAction` skip the `validateFormWithTurnstile` gate that fronts every other mutating form action (HubSpot, Mailchimp). `rateLimiters.strict` (5/min) is applied — the authors knew the endpoint is sensitive — but the CAPTCHA layer guarding equivalent-severity marketing forms was dropped, likely from copying `runFormAction` without carrying the Turnstile call. **Codex NUANCE, folded in:** the comparison to "every other action" is broad (login is 5/min, register 20/min), and there's no current UI consumer — it's latent. It stays high because satus is the auth baseline for client storefronts, the actions are exported/tested/README-listed, and the rate limiter itself is bypassable (M2, and yesterday's XFF note). *Direction: add `validateFormWithTurnstile` before `runFormAction` in both actions; shipping it wired-in is the safer starter posture than documenting "add it yourself."*

Also here: M2 (Shopify webhook query-secret), M19 (Storybook fail-open), M20 (browser Sanity token scope), L3 (Link scheme guard).

### Documentation drift

M12 (Mailchimp GDPR claim vs `status:subscribed`), M16 (raw env vs changelog claim), M17 (AGENTS.md self-contradiction), M18 (undocumented revalidate secret), M23 (customer-auth feature framing), L11 (TS5 stack table), L14 (sanity API-version validation claim), plus the `lib/dev/README.md:40` overstatement noted in §0 (H11 still open).

### Developer experience

M4 (theme FOUC treats the symptom via `suppressHydrationWarning`), M10, M21, L12 (doctor naming), L1 (CI dup).

---

## 4. Design tensions

1. **Two definitions of trust for `ref`, and two graphs for "install a bundle."** H1 (ref redirect) and H2 (requires not resolved in setup) are the same root shape: `satus add` treats an input as load-bearing and validated, `setup:project` treats the sibling input as safe-by-assumption. *Alternative: one shared bundle-resolution + payload-fetch module both entry points call, with validation baked in, so neither can drift ahead of the other.*

2. **"Configured" still means different things per integration** (M11, continuing prior H7/M1). Shopify requires a token; Sanity's live/draft renders with empty-string tokens; HubSpot needs either token or portal id. Each is locally defensible but the registry presents one `isConfigured()` boolean with no capability tier. *Alternative: tier presence (installed-on-disk) vs capability (env-valid for reads / for live+draft), reported separately.*

3. **Env has one documented source of truth and three real ones** (M15, M16, L13, L14). `lib/env.ts` is the advertised validated schema, but `sanity/env.ts` reads raw with its own defaults, `coreEnvSchema` is a doctor-only subset, and two documented vars (`NEXT_PUBLIC_STORYBOOK_URL`, `NEXT_PUBLIC_SANITY_API_VERSION`) never reach the schema at all. This is yesterday's design-tension #4 ("nothing checks doc-claimed env vars against `lib/env.ts`") still open and producing fresh instances. *Alternative: the manifest-check approach the repo already trusts, extended to env — fail CI when a documented var isn't in the schema, or a schema var isn't documented.*

4. **The WebGL frame loop is unified but unbounded, and its "safe by default" claims aren't wired.** One Tempus clock driving R3F/GSAP/Lenis is genuinely good design (refutes the usual "competing tickers" worry), but delta-time correctness rests entirely on Tempus, which has no ceiling (H3), and the documented reduced-motion gate doesn't exist in WebGL (M3). *Alternative: clamp dt at the shared clock, and gate the canvas mount on `!isReducedMotion` so the docs become true.*

5. **Symptoms silenced instead of causes fixed** (M4, M13). `suppressHydrationWarning` hides the theme-flash warning without resolving the theme before paint; the dual-canvas guard warns in dev without preventing the prod cost. Both look "handled" in code review while the user-facing defect ships. *Alternative: resolve theme pre-paint (blocking inline script, à la next-themes) and surface the canvas guard as a build-time check or prod telemetry, not a dev console line.*

---

## 5. Open questions (maintainer input required)

1. **Is `package.json`'s `satus.ref` treated as reviewed/trusted input** anywhere in org process (H1)? And does `create-darkroom`'s cross-repo CLI contract ever forward less-trusted input into `--keep`/`--ref` before it reaches this repo's (currently absent) validation? The remediation is cheap regardless, but this sets H1's real-world severity.
2. **Was skipping `requires` validation in `setup:project` deliberate** (presets happen to be `requires`-closed) or an oversight (H2)? The fix is a one-liner either way but the intent decides whether the interactive path needs a guard too.
3. **Is the WebGL background decorative or load-bearing** on real client builds? Severity of H3 and M14 scales with that answer. And is `theatre` typically stripped before shipping, or kept — which decides whether H11's still-open prod cost matters in practice.
4. **Should `LoginCustomerAction`/`CreateCustomerAction` ship wired to Turnstile by default** (H4), or is CAPTCHA a documented integrator responsibility? Shipping it wired is the safer starter posture.
5. **Is `sanity/env.ts`'s parallel unvalidated env access** (L13) a deliberate import-cycle boundary for the strippable-integration AST tooling, or historical? Decides consolidate-vs-document.
6. **What deployment targets must satus support** (Vercel-only vs portable)? This is the hinge for M19 (Storybook fail-open) and for whether yesterday's rate-limiter note (see §6) stays a non-issue.

---

## 6. Considered & rejected

Carries forward yesterday's ledger (still valid — GraphQL injection, optimistic-cart race corruption, Sanity webhook replay, path/shell injection in bundle *paths*, `setup:project` run twice, tempus SSR guards, dev-tools chunk exclusion, and the rest of §6 in the 2026-07-08 file). New this pass:

- **In-memory rate limiter defeated by X-Forwarded-For spoofing / multi-instance** — surfaced again by the security reader as a fresh high, but yesterday's §6 already ruled on it: Vercel overwrites XFF at the edge and the limiter is a single-instance accepted tradeoff documented in the file's own header. Per the reconciliation rule a documented decision reclassifies severity rather than deleting the finding — so it is **reclassified to an open question** (deployment target, §5.6) plus the concrete durable-store recommendation, not re-filed as a high. Real only on self-hosted-behind-naive-proxy or when the customer-auth path (H4) ships.
- **`WebGLImage` texture-dispose "leak" (prior M14)** — reclassified to by-design: disposing the shared `useTexture`-cached texture would corrupt other consumers of the same URL. The code correctly does not. Bounded drei-cache growth remains, now accurately commented. Not re-filed.
- **`global-error.tsx` theme FOUC** — Codex disproved this half of M4: `global-error.tsx` replaces the root layout and has no hardcoded `data-theme="dark"`, so it doesn't flip. M4 stands for `app/error.tsx` and non-dark pages only.
- **Command injection via the `satus add` tarball `tar` spawn** — investigated (H1 neighborhood): the spawn is array-form, no shell, and extraction failures throw. The exploitable part is the ref redirect (H1), not the spawn.
- **`Image` fake-1×1 CLS (prior H9)** — verified fixed, not re-filed; the discriminated union now enforces an honest layout box.
- **"Two RAF systems fighting" in WebGL** — disproved: Tempus is the single clock; GSAP's and Lenis's own tickers are explicitly disabled. The only real gap is the missing dt clamp (H3).
- **three.js GPU-resource disposal leak** — spot-checked across fluid/flowmap/postprocessing/image and found correct everywhere; the named #1-concern is genuinely well-handled.

---

## 7. Cross-model pass (Codex)

All 6 net-new highs + 7 key mediums were independently verified by Codex (`codex exec --sandbox read-only`, codex-cli 0.144.0) against the repo: **10 AGREE, 3 NUANCE, 0 DISPUTE**, and it found no additional highs in the cited files. Convergent findings are high-conviction.

The three nuances, folded into the findings above:
- **H1** — bounded scope: temp-dir extraction, only requested bundle files copied, `--ref` one-shot; durable vector is a poisoned `satus.ref` (+ dep-injection via the tarball's package.json). Stays high, scope tightened.
- **H4** — no current UI consumer and a 5/min login limiter exists, so the "every other action" framing is broad. Stays high on production-baseline weighting; noted as latent.
- **M4** — `global-error.tsx` doesn't flash (no hardcoded dark); scoped to `app/error.tsx` + non-dark pages.

Process note: per the 2026-07-08 audit, the `codex-verifier` subagent fabricated CLI-unavailable output twice, so this pass was run directly via Bash (as that audit recommended). It worked cleanly. The agent definition still wants a look before it's trusted for this.

Team-knowledge reconciliation: yesterday's audit already reconciled the shared notes; this pass folded its §6 ledger (the rate-limiter reclassification above is the one material severity change). Two stored memories are now stale and flagged for update: `satus-manifest-check-not-in-local-check.md` (the check IS now local; the live issue is the inverse — CI runs it twice, L1), and no change needed to `satus-next-requires-classic-typescript.md`.

---

## 8. Verified sound (spot-checks that passed)

- **GPU-resource disposal** — `Fluid.destroy()`/`Flowmap.destroy()` dispose every render target, material, and geometry via effect cleanup; `PostProcessing` disposes its passes/composer; `WebGLImageMesh` disposes its own material while correctly retaining the shared cached texture.
- **Single unified RAF loop** — Tempus is the one clock; GSAP's and Lenis's internal tickers are explicitly disabled; `frameloop="never"` + manual `advance()` is the right call for a persistent canvas (the only gap is H3's missing clamp).
- **Keep-webgl-drop-theatre** — the theatre bundle's AST transforms strip exactly the `useTheatre` calls, `sheet` vars, and `@theatre` imports that exist, verified against current source; the predicted footgun is well-handled.
- **Boundary validation** — every read Shopify/HubSpot/Mailchimp/Turnstile response goes through `parseApiResponse`/Zod; no unchecked `as T`; `fetchWithTimeout` enforces AbortController timeouts on every outbound call.
- **Sanity security** — GROQ uses `defineQuery` + parameter binding (no injection surface); PortableText uses component serializers (no `dangerouslySetInnerHTML`); draft-mode enable validates a Studio-issued secret server-side; base client is tokenless published-perspective.
- **Turnstile** — fails closed in production when unconfigured and Zod-validates the siteverify response (just not applied to Shopify customer actions — H4).
- **Components** — `Image` (discriminated sizing union, honest placeholder dims), `Link` (SSR-safe prefetch hint via `useSyncExternalStore`), `Marquee` (sparse-array-on-shrink handled), and the Checkbox/Switch/Tooltip/AlertDialog/Menu/Tabs wrappers (thin-but-justified per AGENTS.md Pattern A/B) are all solid.
- **MAX_SPLATS cap** bounds the fluid-sim pending-splat queue against a stalled loop; SSR guarding via `next/dynamic ssr:false` is consistent across every client-only piece.
