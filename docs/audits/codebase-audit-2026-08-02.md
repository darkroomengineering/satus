# Adversarial audit — `/studio` config gate (PR #321)

Scope: the Copilot-reported issue on PR #321 and the fix for it. Codebase mode.
Method: every claim measured against a real `next build` + `next start` and a real
browser, never dev-only and never reasoned-from-source alone.

## Summary

| ID  | Severity | Area         | Issue                                                                                                  | Location                                      | Status            |
| --- | -------- | ------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ----------------- |
| H1  | High     | Sanity       | `isConfigured()` is always false in the browser, so a correctly configured Studio 404s after hydration | `lib/integrations/sanity/sanity.config.ts:40` | CONFIRMED         |
| M1  | Medium   | Studio route | 404 decided by a `notFound()` in a client render rather than on the server                             | `app/studio/[[...tool]]/studio.tsx:13`        | CONFIRMED         |
| M2  | Medium   | Routing      | No root `not-found.tsx`: every route outside `(site)` gets Next's unstyled default 404                 | `app/`                                        | CONFIRMED — FIXED |
| L1  | Low      | Sanity       | `sanityEnvSchema` ignores the `SANITY_STUDIO_PROJECT_ID` alias that `env.ts` honours                   | `lib/utils/validation.ts:22`                  | CONFIRMED         |
| L2  | Low      | Studio route | `/studio` 404 responds 200; the throw lands below an already-flushed Suspense shell                    | `app/studio/loading.tsx`                      | CONFIRMED         |

## Map

Request to `/studio`:

1. `app/layout.tsx` — bare shell (html/body, global CSS, fonts).
2. `app/studio/layout.tsx` — metadata only.
3. `app/studio/loading.tsx` — Suspense boundary. **Its fallback is the static shell and flushes with status 200 before the page resolves.** This is what caps L2.
4. `app/studio/[[...tool]]/page.tsx` — Server Component, `await connection()` for request-time render.
5. `app/studio/[[...tool]]/studio.tsx` — `'use client'`, mounts `NextStudio`.

Key invariant, previously unstated and violated: **`sanity.config.ts` is dual-compiled.**
It has no `'use client'` of its own but is imported across a client boundary, so it is
evaluated in the browser as well as on the server. Any predicate it uses must be
computable in both. That invariant is the whole of H1.

### Expectation gaps

- Expected: `/studio` opens the Studio when Sanity is configured. Found: a 404, in both dev and prod, on `main` and on the PR branch.
- Expected: `isConfigured(id)` means the same thing everywhere. Found: it means "false" in every client bundle, silently.
- Expected: a 404 from the app returns 404. Found: 200 with 404 content.

## Findings

### H1 — `isConfigured()` cannot work in a client bundle (CONFIRMED)

`isConfigured` is `envSchema.safeParse(process.env)` — it passes the whole `process.env`
object. Turbopack only constant-folds **literal** `process.env.NEXT_PUBLIC_X` member
expressions. A wholesale `process.env` reference resolves instead to the npm `process`
browser polyfill, which the emitted bundle initialises as:

```js
;((o.title = 'browser'), (o.browser = !0), (o.env = {}), (o.argv = []))
```

`o.env={}` — permanently empty. So `safeParse({})` fails both `.min(1)` fields,
`isConfigured('sanity')` is `false` in the browser regardless of configuration,
`sanity.config.ts` exports `null`, and `studio.tsx` calls `notFound()`.

The contrast is visible on one emitted line — the inlined literals are right there next
to the check that can't see them:

```js
let dA=dh.safeParse(e_.default.env).success?(0,v.defineConfig)({basePath:"/studio",projectId:"d4xz1vjj",dataset:"production", ...
```

**Scenario.** Configure Sanity properly, `bun run build && bun run start`, open
`/studio`. SSR emits the real `NextStudio` markup; the moment React hydrates, the page
becomes "404: This page could not be found."

**Reproduced** in a browser on prod and dev builds, on `main` and on the PR branch —
pre-existing, not introduced by #321. It was invisible because SSR output looks correct
and `curl` never hydrates.

**Fix applied.** Gate on the already-inlined values instead of the schema:

```ts
export default projectId && dataset ? defineConfig({ ... }) : null
```

Verified: the Studio now boots in the browser (reaches Sanity's own "add CORS origin"
screen, which is project settings, not code).

### M1 — the 404 was a client-render decision (CONFIRMED, Copilot's comment)

Copilot asked for the `config === null` case to be handled in the Server Component
before rendering `<Studio />`. Directionally right, and applied.

Both stated benefits were checked and **neither reproduces**:

- _"prevents shipping/loading the Studio client bundle"_ — in a production build the
  initial HTML referenced **0** Sanity chunks both before and after. Studio's chunks are
  lazy-loaded post-hydration either way. The 14 chunks visible in dev are Turbopack dev
  preloads, not shippable bundle weight.
- _implied status-code correctness_ — 200 before and after, see L2.

The measured delta is ~1.5 KB of HTML on the error path. The reason to take the change
is neither of Copilot's: Next's own bundled JSDoc scopes `notFound()` to Server
Components, Route Handlers, and Server Actions, and a server-side gate is the honest
place for the decision.

The client guard is **kept** as a backstop, not deleted. The two are now evaluated from
the same module (`./env`) so they cannot disagree.

### M2 — no root `not-found.tsx` (CONFIRMED)

#321 moved `not-found.tsx` into `(site)`. Nothing replaced it at the root, so `/studio`
and any future non-`(site)` route render Next's unstyled default 404 instead of the
branded one `main` showed. Cosmetic and arguably fine for an internal route, but it is
an unremarked behaviour change.

**Fixed.** Two route files now, one per layout tier, sharing one view — the same shape
`ErrorView` already uses for the error boundaries. `components/ui/not-found-view/`
holds the markup and takes a `homeLink` prop; `app/(site)/not-found.tsx` passes the
project `Link` inside `Wrapper`, and the new `app/not-found.tsx` renders it bare with a
plain anchor, since under the root layout none of Wrapper's providers exist. Verified in
a browser: `/studio` now shows the branded 404 instead of Next's default.

### L1 — `SANITY_STUDIO_PROJECT_ID` alias is honoured in one place only (CONFIRMED)

`env.ts:26` resolves `projectId` from `NEXT_PUBLIC_SANITY_PROJECT_ID ?? SANITY_STUDIO_PROJECT_ID ?? ''`,
but `sanityEnvSchema` only knows the first. A Vercel-Marketplace install provisioned
under the Studio convention would have had a working `projectId` and still been gated
off. The H1 fix incidentally resolves this, since the gate now reads `projectId`.

### L2 — `/studio` 404 responds HTTP 200 (CONFIRMED)

`app/studio/loading.tsx` puts a Suspense boundary above the page. Next only sets the
404 status when the fallback error escapes the top-level render; below an already-flushed
shell it can only swap the UI. Measured 200 in every configuration tried.

Moving the guard up into `app/studio/layout.tsx` (above the boundary) **crashes the
production build**: `TypeError: Cannot read properties of undefined (reading '4')` while
prerendering `/studio/[[...tool]]`. Not pursued. Accepting 200 here is the cheap call for
an internal, `noindex` route.

## Design tensions

1. **`isConfigured` is a server-only API with no marker saying so.** H1 is the second
   time this has bitten — `env.ts:12-20` already carries a comment about not importing
   `lib/env.ts` into client-reachable code. The pattern keeps recurring because nothing
   enforces it. `import 'server-only'` was the obvious answer and turned out to be
   unusable: the package isn't installed, and its default entry throws on import
   outside Next's RSC layer, so it would break `bun test` and `bun run handoff`, both
   of which import the registry legitimately. Settled on a runtime guard in
   `assertServerEnvironment()` instead — weaker than a build error, but it converts the
   exact silent-false failure into a thrown one. `sanity.config.ts` was the only
   client-reachable caller; that was luck, not design, and the guard is what makes the
   next one loud.
2. **Two sources of truth for "is Sanity configured."** `sanityEnvSchema` and `env.ts`
   answer the same question from different inputs with different alias handling. The fix
   collapses the Studio path onto one; the schema still disagrees elsewhere.
3. **`loading.tsx` costs the route its status codes.** Any `notFound()`/`redirect()`
   below it degrades to 200. Fine for `/studio`; a trap if copied to a public route.

## Open questions

Both questions from the first pass are now answered and closed:

- M2 (root `not-found.tsx`): restore it. Done — see M2 above.
- `server-only` on `registry.ts`: no. Ruled out on evidence (breaks `bun test` and
  `bun run handoff`); replaced with the runtime guard described in tension 1.

Still open, and genuinely outside this PR:

- `lib/integrations/shopify/client.ts` is client-safe only because nothing in a
  `'use client'` file imports it today — a property of the current call graph, not
  something the file enforces. The registry guard covers the symptom; the structural
  question of enforcing that boundary is unanswered.

## Considered & rejected

- _"`return null` in the client guard silently blanks the page in a build/runtime env
  skew."_ Investigated after Codex raised it independently. Real enough to act on — the
  guard was restored to `notFound()` — but the blank-page scenario I first claimed to
  have reproduced was **not** reproduced: in that skew `defineConfig` throws
  `Configuration must contain 'projectId'` at module scope before either branch runs.
- _"#321 breaks the Studio."_ Initially read as a regression from a page title reading
  "Sanity Studio - Satūs" on `main`. The snapshot showed the body was `main`'s styled
  404 — both branches 404, only the 404's appearance differs (that is M2).
- _"The server gate keeps the Sanity bundle off the wire."_ Measured 0 chunks before and
  after in production. Rejected as a stated benefit.
