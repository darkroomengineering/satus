# Adversarial Codebase Audit — 2026-07-08

Whole-repo honesty audit of satus (`main`, post-TS7 migration): does the system do what it promises? Five area readers covered ~27k lines of TS/TSX in full (scripts CLI, integrations + API routes, components + app, webgl/hooks/utils runtime, config/docs/CI). Every finding below survived an independent disprove pass — traced at the cited lines before inclusion. Cross-model verification (Codex) and team-knowledge reconciliation noted where they changed a classification.

**Totals: 11 high · 19 medium · 12 low.** CONFIRMED = traced end-to-end; PLAUSIBLE = mechanism verified, trigger condition not reproduced live.

---

## 1. Summary table

| ID | Sev | Area | Issue | Location | Status |
|---|---|---|---|---|---|
| H1 | high | shopify | Storefront endpoint built without `https://` scheme — every call fails when docs are followed | `lib/integrations/shopify/client.ts:9` | CONFIRMED |
| H2 | high | shopify | Webhook revalidation fully implemented but wired to no route; READMEs claim it works — products never refresh | `lib/integrations/shopify/revalidate.ts` | CONFIRMED |
| H3 | high | ci | Dependabot auto-merge gates on workflow named "Test"; only "CI" exists — automation silently never fires | `.github/workflows/automerge-dependabot.yml:13` | CONFIRMED |
| H4 | high | docs | SECURITY.md claims CodeQL runs on every change; no CodeQL workflow exists | `SECURITY.md:54` | CONFIRMED |
| H5 | high | docs | Sanity README documents `/studio` route + `NEXT_PUBLIC_SANITY_STUDIO_URL`; route removed, var read nowhere | `lib/integrations/sanity/README.md:17,42` | CONFIRMED |
| H6 | high | scripts | `satus add --force` is a total no-op: installed bundles are filtered out before the force path runs | `lib/scripts/satus.ts:203-211` | CONFIRMED |
| H7 | high | scripts | Handoff derives integration presence from env validity (`getConfigured`), not disk (`isInstalled`) — missing local secrets strip a shipped integration from all handoff artifacts | `lib/scripts/prepare-handoff.ts:19,157,246,272` | CONFIRMED |
| H8 | high | scripts | Snapshot silently skips missing bundle files; installer later throws on the same file — after self-prune already ran → unrecoverable partial state | `lib/scripts/setup-project.ts:289-356`, `bundle-installer.ts:62` | CONFIRMED |
| H9 | high | components | `<Image>` without `aspectRatio` silently defaults to fake 1×1 dims + CSS `auto` — CLS jump with no console warning (dims are "supplied"); README frames the prop as an enhancement when it's load-bearing | `components/ui/image/index.tsx:163-164` | CONFIRMED |
| H10 | high | components | Form gates disagree: Enter bypasses the "disabled" submit (onSubmit never checks validity); an untouched optional field keeps `isReady` false forever, blocking click-submit | `components/ui/form/hook.ts:55-81` | CONFIRMED |
| H11 | high | webgl | `TheatreProjectProvider` mounted nowhere, yet `@theatre/core` (prod dependency) is imported unconditionally by the always-mounted canvas — permanently inert feature in the prod bundle | `lib/dev/theatre/index.tsx:23`, `lib/webgl/components/canvas/webgl.tsx:7,63` | CONFIRMED |
| M1 | med | sanity | Draft-mode gate checks `isConfigured` but not `privateToken`; token `''` → uncaught TypeError → 500 instead of intended 503 | `app/api/draft-mode/enable/route.ts:5-12` | CONFIRMED |
| M2 | med | shopify | `dataSchema` payload validation is opt-in and zero callers use it, while Mailchimp/HubSpot validate payloads at the boundary | `lib/integrations/shopify/client.ts:64-66` | CONFIRMED |
| M3 | med | hubspot | No Turnstile gate on the newsletter action while sibling Mailchimp actions require it — inconsistent bot posture | `lib/integrations/hubspot/action.ts:34-77` | CONFIRMED |
| M4 | med | sanity | Bulk publish can 429 Sanity's own revalidation webhooks (shared per-IP bucket, 20/min) — pages silently stay stale | `app/api/revalidate/route.ts:8-9` | PLAUSIBLE |
| M5 | med | scripts | `bun install` at the final step has no error handling — offline/registry failure exits raw *after* self-prune already deleted the retry path | `lib/scripts/setup-project.ts:737`, `satus.ts:295` | CONFIRMED |
| M6 | med | scripts | Per-file AST transform failures are logged and swallowed; CLI exits 0 claiming success with wiring silently un-stripped | `lib/scripts/ast-transforms/index.ts:157-160` | CONFIRMED |
| M7 | med | docs | README Scripts block says `bun build` — that invokes Bun's bundler, not the package script (`bun run build`) | `README.md:133` | CONFIRMED |
| M8 | med | ci | Local/commit/CI gates disagree: pre-commit runs Biome+tsc only; `check` adds tests; CI adds build+manifest — "must pass before commit" overstates. Manifest sub-gap is a documented team decision | `lefthook.yml:5-17` vs `package.json` vs `ci.yml` | CONFIRMED |
| M9 | med | dx | `sanity:extract`/`sanity:typegen` hard-require `.env.local` with no existence check or guided error | `package.json:39-40` | PLAUSIBLE |
| M10 | med | tests | Shopify/HubSpot actions have unit tests; Mailchimp/Sanity have none, while AGENTS.md implies boundary-validation parity | `lib/integrations/mailchimp/` | CONFIRMED |
| M11 | med | ci | Playwright e2e suite exists but nothing in CI runs it — the a11y/console smoke can regress with zero signal | `.github/workflows/ci.yml` | CONFIRMED |
| M12 | med | components | `register()` returns fresh closures every call; field refs detach/reattach on sibling re-renders, resetting validation state — tests work around it and bet on the React Compiler | `components/ui/form/hook.ts:118-147` | PLAUSIBLE |
| M13 | med | components | `preload` prop JSDoc claims LCP preloading but only sets `loading='eager'` — never Next's `priority` machinery; README example uses `priority` instead | `components/ui/image/index.tsx:119,138` | CONFIRMED |
| M14 | med | webgl | `WebGLImage` never disposes the previous texture on `src` change (drei cache retains it — bounded, but GPU memory accretes per distinct src) | `lib/webgl/components/image/webgl.tsx:29-47` | CONFIRMED |
| M15 | med | docs | Live docs claim WebGPU/TSL renderer with capability auto-detection; zero WebGPU/TSL code exists (plain WebGLRenderer + GLSL3) | `lib/webgl/README.md:1`, `lib/features/README.md:39` | CONFIRMED |
| M16 | med | webgl | `useTexture(src ?? '')` with undefined src resolves `''` to the document URL and attempts a real image decode of the page's own HTML | `lib/webgl/components/image/webgl.tsx:29,39` | PLAUSIBLE |
| M17 | med | webgl | `WebGLCanvasProps` exposes no `simTypes`, so the documented perf escape hatch (skip fluid or flowmap sim) is unreachable — every root-canvas page pays both sims every frame | `lib/webgl/components/canvas/webgl.tsx:72-77` | CONFIRMED |
| M18 | med | utils | Module-scope `Tempus.add` discards its unsubscribe — HMR/duplicate-chunk re-evaluation permanently double-registers the frame flush | `lib/utils/raf.ts:23-29` | PLAUSIBLE |
| M19 | med | webgl | No runtime guard against two `<Canvas root>` (layout + page) — both mount full WebGL contexts rendering the same tunnel, silently doubling GPU cost | `lib/webgl/components/canvas/index.tsx:57-83` | CONFIRMED (mechanism) |
| L1 | low | ci | Local pinned `bun@1.3.5` via packageManager; CI floats `bun-version: latest` — undiagnosable local/CI divergence over time | `package.json:118` vs `ci.yml:20` | CONFIRMED |
| L2 | low | config | `SOURCE_MAPS` flag is undocumented and unreachable (`typeof Bun === 'undefined'` guard is never true under the repo's own build script) | `next.config.ts:19-20` | CONFIRMED |
| L3 | low | scripts | No project-root validation before destructive work — wrong cwd yields a raw ENOENT, not "run from project root" | `lib/scripts/setup-project.ts:698-699` | CONFIRMED |
| L4 | low | scripts | Repeated flags silently resolve to the first occurrence (`--keep sanity --keep webgl` drops webgl, no warning) | `lib/scripts/utils.ts:141-157` | CONFIRMED |
| L5 | low | scripts | `doctor` checks presence, not freshness — reports green with stale generated styles or COMPONENTS.md | `lib/scripts/doctor.ts:100-118` | CONFIRMED |
| L6 | low | components | Two disagreeing definitions of "external link": `Link`'s URL-prefix logic vs Header's hand-authored `external` flags; `data-external` has no consumer | `components/ui/link/index.tsx:22-24` vs `header/index.tsx:24-34` | CONFIRMED |
| L7 | low | components | Shrinking marquee `repeat` leaves stale refs the RAF loop keeps animating (detached nodes) | `components/ui/marquee/index.tsx:80-82,110-115` | PLAUSIBLE |
| L8 | low | hooks | `use-prefetch` spreads `options` object into effect deps unstabilized — inline literals recreate the IntersectionObserver every render | `lib/hooks/use-prefetch.ts:19,59` | CONFIRMED |
| L9 | low | docs | `lib/utils/README.md` documents `measure`/`batch` exports removed in PR #229 — copy-pasting its own example fails to compile | `lib/utils/README.md:19` | CONFIRMED |
| L10 | low | docs | Hooks README destructures `isTablet`/`isTouch` from `useDeviceDetection`; neither key exists (`isTouchOnly` does) — silent `undefined` | `lib/hooks/README.md:149` | CONFIRMED |
| L11 | low | webgl | `splats[]` grows on pointer-move and only drains in `update()` — unbounded if the sim's frame loop pauses while listeners live | `lib/webgl/utils/fluid/fluid-sim.ts:334,507-551` | PLAUSIBLE |
| L12 | low | dev | Module-scope `storage` listener with no removal — same HMR double-registration class as M18 | `lib/dev/orchestra.ts:21-27` | PLAUSIBLE |

---

## 2. System map (as verified)

**Entry points.** `app/layout.tsx` (Wrapper → Header/Footer/Lenis; optional shared root Canvas via `lib/features`), `app/page.tsx`, three API routes (`draft-mode/enable|disable`, `revalidate` — Sanity-only in practice, see H2). CLI surface: `setup:project` (destructive, self-pruning), `satus` (add/list against the public repo as registry), `dev`, `doctor`, `generate*`, `handoff`.

**Real execution paths that differ from documented ones:**
- Shopify data flow is documented end-to-end but the first fetch throws on URL parse (H1) and cache invalidation has no route (H2) — the integration has plausibly never been exercised as documented.
- The "add an integration back" path (`satus add`) works for absent bundles only; the documented `--force` repair path doesn't exist behaviorally (H6).
- Draft mode's "not configured" path returns 503 only for the *fully* unconfigured case; the partially-configured case (no token) 500s inside next-sanity (M1).

**Key invariants and where they're enforced:**
- "Fail fast, mutate never" holds at CLI arg parsing (verified sound) but *not* mid-run: snapshot-vs-installer asymmetry (H8) and unhandled `bun install` (M5) both violate it after the point of no return (self-prune).
- "Validate at the boundary" is enforced for envelopes everywhere but for payloads only in Mailchimp/HubSpot (M2) — a convention, not a contract.
- "One root canvas" is documented and assumed, never enforced (M19).
- Two competing definitions of "integration present": disk (`isInstalled`, bundle-installer) vs env (`isConfigured`, registry). H7 is the collision.

**Expectation gaps (expected X, found Y):**
- Expected `--force` to overwrite → it's filtered out before evaluation (H6)
- Expected optional form fields to be optional → they block click-submit until touched (H10)
- Expected `<Image src alt>` to render sanely → fake 1×1 + CLS (H9)
- Expected `preload` to preload → sets `loading` only (M13)
- Expected `simTypes` perf hatch → prop not plumbed through (M17)
- Expected docs' `/studio`, WebGPU, `measure/batch`, CodeQL, Shopify revalidation → none exist (H5, M15, L9, H4, H2)

---

## 3. Findings by hunt category

Severity order within category; full detail for highs, table above covers the rest.

### Correctness

**H8 — Unrecoverable partial failure in setup:project.** `setupSnapshot` guards every copy with `pathExists` and silently skips absentees (`setup-project.ts:301,310,329`), but `installBundle`/`readPayloadFile` throw hard on the same missing file (`bundle-installer.ts:62`, `payload-source.ts:152`). Sequence: step 6 strips integration folders → step 7 self-deletes `setup-project.ts` and its npm scripts → step 9 writes package.json → step 10 throws. A fork that hand-deleted one bundle file (e.g. sanity's `app/api/draft-mode/enable/route.ts`) exits non-zero with the integration gone and no script left to re-run. Weighted up by team-knowledge: `setup:project` is the public contract behind `bun create darkroom` — a broken run breaks scaffolding, not just a repo. *Direction: snapshot and installer must share one strictness policy (validate the full manifest upfront, before any mutation), and self-prune must be the last step.*

**H10 — Form validity gates disagree with each other and with `required`.** `onSubmit` (`hook.ts:71-81`) builds FormData and fires the action unconditionally — `isReady`/`isValid`/`errors` are never consulted, so Enter bypasses the visually disabled submit (server-side Zod still validates, so this half is gate-inconsistency, not data corruption). The worse half: registration seeds `isValid=false` for every non-hidden field (`hook.ts:55-69`) and only that field's own interaction flips it — an untouched *optional* field keeps `isReady` false forever, so click-submit never unblocks. A contact form with an optional "company" field cannot be submitted by mouse. *Direction: seed optional fields valid; make onSubmit and the button read the same gate.*

**M14, M16, M12, M18, L7, L8, L11, L12** — see table. Common thread: lifecycle edges (src changes, HMR re-evaluation, prop shrink) where setup ran but the matching teardown/re-init doesn't.

### Alternative / unintended paths

**M5 — `bun install` as unguarded final step** (`setup-project.ts:737`, mirrored `satus.ts:295`): offline or registry 5xx exits raw after every mutation and the self-prune landed; the user must know to run `bun install` manually. **M4** — Sanity bulk publish vs the shared 20/min IP bucket on `/api/revalidate`. **M19** — dual root canvas. **L3, L4** — wrong-cwd and duplicate-flag ergonomics.

### Incoherences

**H7 — env-validity vs disk-presence as "is this integration here".** `prepare-handoff.ts` imports only `getConfigured`/`getConfiguredIds` (registry, env-based); `isInstalled` (disk-based) exists in `bundle-installer.ts` and is never consulted. Dev without prod secrets in the shell runs `bun run handoff` → Sanity (fully present and shipping) is stripped from the delivered `.env.example`, omitted from INVENTORY.md, and its entire DEPLOYMENT-CHECKLIST.md section (CORS, webhooks, token rotation) is skipped. *Direction: presence = disk; env validity is a separate reported axis ("installed but unconfigured").*

**M2, M3** — boundary validation and bot posture applied per-integration rather than by contract. **M8** — three different gate sets (pre-commit ⊂ check ⊂ CI); the manifest:check sub-gap is a documented team decision (reclassified accordingly), the test/build gaps are not. **L1, L6** — version-pin and external-link duality.

### Affordance mismatches

**H6 — `--force` no-op.** `statuses.filter(s => !s.installed)` drops installed bundles; `runAdd` prints "already installed — nothing to do" and returns before `installBundle`/`applyOverwriteFiles` — the only code that reads `force` — can run (`satus.ts:203-211`). The exact case `--force` documents (overwrite existing/stale/hand-edited files) is the case that's skipped. **H9 — Image's fake 1×1 defaults** (`width = block ? 1 : undefined`, `image.module.css` strips the box with `auto`): omitting an optional prop produces broken rendering, and the README calls the load-bearing prop an optimization. **M13, M17, M9, L2** — see table.

### Missing functionality

**H2 — Shopify revalidation dead wiring.** `shopify/revalidate.ts` implements the full webhook handler (topic parsing, secret check, tag revalidation) and its own comment claims it's "called from `app/api/revalidate.ts`" — zero imports exist; the actual route is Sanity-only. With `cache: 'force-cache'` + tags and no time-based revalidate on products/collections, Shopify content changes never reach pages short of a redeploy. Two READMEs assert the wiring works. **M10, M11** — test/e2e coverage gaps vs documented parity.

### Boundary and safety

**H11 — Theatre runtime on the wrong side of the prod boundary.** The editor half is correctly dev-gated (verified: `isDevelopment` + `dynamic()`, `@theatre/studio` in devDependencies, chunk never fetched in prod). But the runtime half — `SheetProvider`/`useTheatre` — is imported unconditionally by the always-mounted canvas, tunnel, and both sims, pulling `@theatre/core` (a prod `dependency`) into every WebGL page while `TheatreProjectProvider` is mounted nowhere, making every sheet `undefined` and the entire feature permanently inert, including the ⚙️ Studio toggle which opens an editor bound to nothing. **M1** — the 500-vs-503 token gate. (Deployment-target rate-limit trust and GraphQL injection were investigated and cleared — see §6.)

### Documentation drift

**H4** (CodeQL), **H5** (`/studio` + two env vars, both dead — `NEXT_PUBLIC_SANITY_STUDIO_URL` verified read nowhere), **M7** (`bun build`), **M15** (WebGPU/TSL), **L9** (`measure`/`batch` — removal traced to PR #229 via team-knowledge; README never followed), **L10** (`isTablet`/`isTouch`).

### Developer experience

**M6 — dishonest exit code**: `applyCodeTransforms` catches per-file failures, logs to stderr, and returns a count with no failure signal; callers print success and exit 0 with wiring silently un-stripped. **M9, L3, L4, L5** — see table.

---

## 4. Design tensions

1. **Two truths for "integration present"** — env-based `isConfigured` vs disk-based `isInstalled` answer the same question differently and scripts pick whichever is at hand (root of H7; adjacent to H5's stale env docs). *Alternative: one presence API on the registry keyed off disk, with env validity as an orthogonal reported state.*

2. **Boundary validation as convention, not contract.** The purchase-path integration (Shopify) is the one that skips payload validation (M2) and the sibling form integrations disagree on bot protection (M3). *Alternative: make `shopifyFetch` require a `dataSchema` (with an explicit escape hatch), and hoist Turnstile into `runFormAction` as opt-out rather than per-integration opt-in.*

3. **Theatre's integration seam is on the wrong side of the bundle.** The strippable-integration machinery exists (AST ops strip theatre from webgl on setup), but the default repo ships the runtime wired into every WebGL page for a feature with no mount point (H11). *Alternative: mount the provider (make the feature real), or invert the default — ship stripped, `satus add theatre` wires it.*

4. **Docs can promise what code doesn't deliver, with no gate.** The repo already solved this class for exports (`manifest:check`, CI-gated) but nothing checks doc-claimed commands, routes, env vars, or capabilities — which is where five findings live (H2, H4, H5, M15, L9). *Alternative: extend the manifest approach — a docs-claims check that verifies documented commands exist in package.json, documented routes exist in app/, documented env vars appear in lib/env.ts.*

5. **The three quality gates are three different gates** (M8, M11): pre-commit (Biome+tsc) ⊊ `check` (+tests) ⊊ CI (+build+manifest, −e2e). Every gap is a class of green-local/red-CI (or silent-regression) surprise. *Alternative: one canonical gate list in package.json consumed by all three layers, with documented, deliberate exclusions.*

---

## 5. Open questions (maintainer input required)

1. ~~Has the Shopify integration ever run in production from these docs?~~ **Answered (2026-07-09):** Shopify is optional but real — satus is the starter for custom storefront builds. This elevates H1/H2/M2: forks shipping storefronts are each absorbing the scheme bug locally (with-scheme env values or a patched client), and none get cache invalidation (H2) from the starter. Direction: normalize the scheme in `client.ts` (accept both forms), tighten `sanityEnvSchema`'s shopify sibling to match, and wire `shopify/revalidate.ts` into the revalidate route.
2. **Is handoff's env-based filtering intentional** ("only hand off what's configured in this shell") or the bug H7 treats it as? The fix differs radically.
3. **Theatre: activate or strip?** H11 can resolve by mounting `TheatreProjectProvider` (feature becomes real) or by moving the runtime behind the existing strip seam (default lean). Which direction matches intent?
4. **Is HubSpot-sans-Turnstile a client-specific decision** or an omission (M3)?
5. **`preload` on Image (M13): alias it to Next's `priority`, or delete it** in favor of the passthrough the README already demonstrates?
6. **Auto-merge (H3): was "Test" a renamed workflow?** Rename the trigger to "CI" or delete the automation if it's abandoned — its current state is worse than either.

---

## 6. Considered & rejected

Investigated and disproved — recorded so the next audit doesn't re-litigate:

- **XFF spoofing defeats rate limiting on Vercel** — Vercel overwrites `X-Forwarded-For` at the edge; the first-segment trust is safe on the documented target. Residual risk only on self-hosted-behind-naive-proxy (noted, not filed).
- **GraphQL injection via handles/IDs** — all user values travel in `variables`, never interpolated into query text (whole-tree grep).
- **Optimistic cart race corrupting state** — `useOptimistic` re-bases from server-confirmed cart; totals authoritative at Shopify checkout.
- **Sanity webhook replay** — HMAC-verified via next-sanity, and `revalidateTag` is idempotent.
- **Skip-link broken by `scroll={false}` default** — Lenis mounts with `anchors: true` on effectively every page and intercepts anchor scroll; no-JS falls back native. Breaks only on explicit `lenis={false}` pages.
- **Scrollbar drag math mixing coordinate spaces** — container is `position: fixed; top: 0`, so the subtraction is correct.
- **CRLF false "locally modified" on Windows** — `.gitattributes` forces `eol=lf` repo-wide.
- **Path traversal / shell injection in CLIs** — all paths hardcoded in bundles; ids allowlist-validated; sole shell-adjacent call uses arg arrays.
- **`setup:project` run twice** — self-prune is by-design; second run fails cleanly.
- **`--keep '' --preset X` slipping the guard** — checks `!== undefined`, guard holds.
- **`bun test` picking up `.e2e.ts`** — default glob doesn't match; separation structural.
- **`@/components/*` alias gap** — wildcard `@/*` resolves it via longest-match.
- **Biome/tsconfig glob disagreement** — both see the same test surface.
- **SSR window access at module scope in the animation runtime** — tempus guards internally (`isClient`); orchestra checks `typeof window`.
- **Dev tools (Orchestra/Studio editor) leaking into prod network payload** — `isDevelopment` + `dynamic()` gate verified; the chunk is never fetched (distinct from H11, which is about `@theatre/core`, the runtime half).
- **Fork stripping theatre breaks webgl** — hooks degrade to `undefined` sheet / no-op (which is also the shipped state, per H11).
- **RAF component double-subscribing on HMR** — uses `useTempus` (effect-scoped, cleanup-correct), unlike the module-scope cases M18/L12.
- **`data-external` unused attribute as its own finding** — inert; folded into L6.

## 7. Cross-model pass (Codex)

All 11 highs + 6 key mediums were independently verified by Codex (`codex exec --sandbox read-only`, codex-cli 0.142.0, gpt-5-class model) against the repo: **14 AGREE, 3 NUANCE, 0 DISPUTE**, and it found no additional highs in the cited files. Convergent findings are high-conviction.

The three nuances, folded in:
- **H5** — `NEXT_PUBLIC_SANITY_STUDIO_URL` is indeed read nowhere, but sanity computes a `studioUrl` from `NEXT_PUBLIC_BASE_URL` (dev default) — so studio-URL *functionality* exists; the README just documents the wrong variable and a dead route. Finding stands as doc drift.
- **H9** — CLS mechanism confirmed; but since 1×1 dimensions *are* technically supplied, Next's aspect-ratio console warning may not fire. The "silent" part is worse than originally stated; the warning claim is withdrawn.
- **M1** — Codex confirmed the repo-side gate omission but couldn't verify the throw inside `next-sanity` from the repo alone; our reader traced `next-sanity/dist/draft-mode/index.js` and `@sanity/preview-url-secret` source directly, so CONFIRMED stands on that stronger evidence.

Process note: the `codex-verifier` subagent failed twice (second attempt fabricated CLI-unavailable output with zero executed commands — contradicted by direct verification). The pass above was run directly via Bash instead; the agent definition needs a look before it's trusted again.

---

## 8. Verified sound (spot-checks that passed)

- AST transform ops are genuinely idempotent, exercised by round-trip tests plus a live `tsc --noEmit` e2e gate.
- Fluid/Flowmap sims dispose every FBO/material/geometry they allocate (`destroy()` wired through effect cleanup); postprocessing lifecycle correct.
- Sanity token scoping: base client is published-perspective, CDN, tokenless; private tokens applied only at the draft/live boundary; no client-bundle leak.
- Draft-mode redirect target is re-parsed to path-only — no open redirect.
- Turnstile fails closed in production when the secret is missing and Zod-validates the siteverify response.
- AGENTS.md Commands table matches package.json line-for-line (including today's TS7 rename); tsconfig strict-flag list matches docs exactly.
- `useReveal` truly degrades to visible without JS; `RealViewport` matches its README line-for-line; Base UI wrappers preserve focus/keyboard behavior.
- Rate limiting claimed in SECURITY.md is real (`proxy.ts` → `lib/utils/rate-limit`).
