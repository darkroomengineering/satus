# AGENTS.md - Satus Engineering Standards

This is the **single source of truth** for engineering standards in this repo. Claude Code, Codex, Cursor, and other AI tools read this file. `.cursor/rules/` points here. Do not add a `CLAUDE.md`: while one exists, Claude Code skips loading this file.

This file changes only by deliberate review. When `next dev` detects an AI coding agent it appends a managed block here (an HTML comment fencing `nextjs-agent-rules`); `agentRules: false` in `next.config.ts` stops that. Keep it off. If the block appears, revert it and do not commit it. Do not include its opening marker in prose: Next searches for that exact string, and a match truncates everything below it on the next `next dev` run.

---

## Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Framework          | Next.js 16 (App Router, `proxy.ts`)                   |
| UI                 | React 19.3 (React Compiler ON, no manual memoization) |
| Language           | TypeScript 7, `strict: true`                          |
| Styling            | Tailwind v4 (CSS-first) + CSS Modules                 |
| Runtime            | Bun                                                   |
| Linter / Formatter | oxlint + oxfmt                                        |
| Validation         | Zod                                                   |
| Animation          | Lenis, anime.js, Tempus                               |
| 3D (optional)      | React Three Fiber, `@react-three/drei`                |

---

## Enforced Rules (CI fails without these)

`bun run check` and CI enforce these rules; the pre-commit hook runs oxlint and tsc. Type-aware rules run only in `lint:types`, `check`, and CI because `next build` does not typecheck (`ignoreBuildErrors` is on).

### oxlint rules

| Rule                                 | What it catches                                                                                                                                                                                                                                                    | Enforcer                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `typescript/no-explicit-any`         | `any` types                                                                                                                                                                                                                                                        | oxlint `typescript`                |
| `typescript/consistent-type-imports` | Missing `import type` for type-only imports                                                                                                                                                                                                                        | oxlint `typescript` (`.ts`/`.tsx`) |
| `typescript/consistent-type-exports` | Missing `export type` for type-only re-exports                                                                                                                                                                                                                     | oxlint `typescript`, type-aware    |
| `nextjs/no-img-element`              | Raw `<img>` tags; use `@/components/ui/image` for optimization and WebGL integration                                                                                                                                                                               | oxlint `nextjs`                    |
| `react/forbid-elements`              | Raw `<a>` tags; use `@/components/ui/link` for external detection, prefetching and consistent behavior                                                                                                                                                             | oxlint `react`                     |
| `eslint/no-restricted-imports`       | `../../` imports (use `@/` aliases), `forwardRef` (React 19 ref-as-prop), `useMemo`/`useCallback`/`memo` (React Compiler), hamo `useMediaQuery` (use `useDeviceDetection` or `desktop-only`/`mobile-only` markup), `next/image` (use `@/components/ui/image`)      | oxlint `eslint`                    |
| `hamo/no-raw-layout-read`            | `getBoundingClientRect`, `offset*`/`client*`/`scroll*` sizes, `window.scrollY`, `getComputedStyle` and other forced-layout reads; use hamo `useRect`, `useWindowSize`, `useResizeObserver`, or `lenis.scroll` because raw reads force layout on every scroll/frame | `tools/oxlint/hamo`                |
| `hamo/no-raw-observer`               | `new ResizeObserver`/`IntersectionObserver`, `matchMedia`, window `resize`/`scroll` listeners; use hamo, `useDeviceDetection`, or Lenis                                                                                                                            | `tools/oxlint/hamo`                |
| `styling/no-class-string-variable`   | Tailwind class lists stored in variables, `cn()` results, variant maps, or helper returns; write them in `className`, extract a component, or use the CSS module because stored lists travel across files and skip oxfmt sorting and IntelliSense                  | `tools/oxlint/styling`             |
| `eslint/no-unused-vars`              | Unused imports, variables and parameters                                                                                                                                                                                                                           | oxlint `eslint`                    |
| `react/jsx-key`                      | Missing `key` in list renders                                                                                                                                                                                                                                      | oxlint `react` (`.tsx`/`.jsx`)     |
| `jsx-a11y/alt-text`                  | Images without `alt` text                                                                                                                                                                                                                                          | oxlint `jsx-a11y`                  |
| `react/button-has-type`              | `<button>` without `type`                                                                                                                                                                                                                                          | oxlint `react`                     |
| `react/no-danger-with-children`      | XSS risk                                                                                                                                                                                                                                                           | oxlint `react`                     |
| `import/first`                       | Imports outside the top of a file                                                                                                                                                                                                                                  | oxlint `import`                    |
| `react/rules-of-hooks`               | Hooks called conditionally or outside components                                                                                                                                                                                                                   | oxlint `react`                     |
| `typescript/no-floating-promises`    | Un-awaited promises                                                                                                                                                                                                                                                | oxlint `typescript`, type-aware    |
| `typescript/no-misused-promises`     | Async functions passed where void is expected                                                                                                                                                                                                                      | oxlint `typescript`, type-aware    |

Fix lint errors in code; never disable a rule to get green. `bun run check:disables` (part of `bun run check`) counts every `oxlint-disable`/`eslint-disable` directive per rule and `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` under their own names. Counts must match `lint-disables.json`, and each directive must include `-- <reason>` after rule names. An agent does not add a disable or change counts; report the error and the unresolved fix instead. The count makes suppressions visible for reviewer approval.

The `hamo` plugin (`tools/oxlint/hamo/`) routes layout reads and observers through a shared observer that measures once per resize; a raw read forces layout on every scroll or frame. Tests, e2e specs and `lib/scripts/**` are exempt.

The vendored `tools/oxlint/anti-slop/` plugin (from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop)) rejects `Reflect.get`/`Reflect.apply`, `object`-typed parameters, aliases that only rename `unknown`, widen-then-assert flows, and module mocking in tests. All fifteen rules are errors. `eslint/prefer-named-capture-group` and `typescript/prefer-nullish-coalescing` remain off with finding counts in `oxlint.config.ts`; enable them one at a time as findings are fixed. Run plugin tests with `bun run test:oxlint-plugin` under Node, not `bun test`: files use `*.ruletest.ts` because oxlint RuleTester refuses Bun.

`oxfmt` sorts Tailwind classes and imports, so sorting is fixed by `bun run format` or format-on-save and never fails `bun lint`. `bun lint:types` runs the two type-aware rules because syntax-only lint cannot detect them; it is in `bun run check`, not the pre-commit hook, to keep commits fast. Toolchain details: ARCHITECTURE.md § Linting and Formatting.

### TypeScript strict flags (all active in `tsconfig.json`)

`strict`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`

### Path aliases (required, enforced by `eslint/no-restricted-imports`)

Use `@/components/ui/image` and `@/components/ui/link`, not `next/image` or `next/link`; use named aliases `@/hooks/*`, `@/styles/*`, `@/integrations/*`, `@/webgl/*`, `@/utils/*`, `@/config`, `@/dev`, and `@/dev/*`. Everything else, including `@/components/*` and `@/lib/*`, resolves through `@/*`, mapped to the repository root in `tsconfig.json` (for example, `@/components/ui/link` resolves to `components/ui/link`). Aliases avoid deep relative imports and preserve stable paths.

---

## House Style (Darkroom conventions)

These conventions are subjective starter choices and can change in a fork without breaking the build. Worked component patterns live in ARCHITECTURE.md § Code Patterns.

### Component file shape

- Use named function declarations for components, `interface` for object shapes, and `type` for unions/intersections.
- Extend `ComponentProps<'element'>` when wrapping HTML elements.
- Use kebab-case filenames (`my-component.tsx`, `my-component.module.css`) and camelCase CSS classes (`.isPrimary`, `.isDisabled`).

### Styling split

- Use Tailwind for spacing, colors and typography; CSS Modules for complex animations, custom layouts and specificity. Combine with `cn()` from `clsx`.
- Keep class lists inline; the lint rule covers stored lists. Repeated one-off classes become an `@utility`, repeated markup a component, and repeated conditions stay inline in `cn()`.
- A component exposing `className` puts its CSS module in `@layer components`: Tailwind utilities then override it. `image.module.css` is the exception, layered into `utilities` so Tailwind `object-*` wins by specificity. No `tailwind-merge` is needed because layers resolve module/utility precedence, not utility/utility conflicts.
- Use `h-svh` for documents and heroes, `h-dvh` only for app shells tracking the browser toolbar, never `h-screen`.
- Keep `<Wrapper safariEdges>` strips (`components/layout/safari-edges`) outside transformed ancestors because transforms break `position: fixed`. They color Mobile Safari's status bar and toolbar via `--edge-top`/`--edge-bottom` (default `--color-primary`); each is one solid color. Drawing behind the notch also requires `viewportFit: 'cover'` and safe-area padding, which satus does not enable. See [the technique](https://joshpuckett.me/seamless-mobile-safari).
- Animate only `transform` and `opacity` for compositor performance.
- Gate below-fold CSS `background-image` URLs behind hamo `useIntersectionObserver` (`rootMargin: '100% 0px'`) or use `<img loading="lazy">`: rendered elements download backgrounds at page load even when hidden, adding 302 KB and 5.4 seconds on Slow 3G in the measured case.

### Animation

- Use `useReveal` (`lib/hooks/use-reveal.ts`) for CSS-driven entrances: it stays on the compositor, renders visible without JS and short-circuits reduced motion. Stagger with `data-reveal-item`; tune `--reveal-transform`, `--reveal-stagger`, `--reveal-duration`. The mechanism lives in `global.css`.
- Use anime.js for orchestration and scrubbing (`createTimeline`, `animate` with `autoplay: onScroll({ sync: true })`, `splitText`). The Lenis bridge (`components/layout/lenis/anime.tsx`) schedules anime on Tempus after Lenis writes scroll, keeping one RAF loop and matching each scrub to that frame's scroll. Simple reveals stay in CSS to avoid main-thread work.
- Create animations from elements in `useEffect` because anime selectors are global, not ref-scoped. Return `revert()` to restore inline styles and tear down linked `onScroll`; revert standalone `onScroll`, remove shared timeline targets with `timeline.remove(target)`, and revert `splitText` markup and registered `addEffect` animations (see `components/effects/progress-text`) to prevent leaks across navigation.
- Pin with CSS `position: sticky` inside a taller parent; anime.js has no pin. Use CSS transitions for hover/toggle micro-interactions (at most 200ms). Use Lenis for smooth scroll and Tempus for RAF scheduling.
- Honor reduced motion: movement and button `:active` scaling go inside `@media (--motion-ok)` (`prefers-reduced-motion: no-preference`); opacity and color transitions stay unconditional. Gate JS/WebGL with `usePreferredReducedMotion`.
- Off-screen content keeps animating. Start infinite CSS animations paused and run them only while visible using hamo `useIntersectionObserver`; skip frame-loop writes while hidden (as in `components/ui/marquee`). Per-frame writes use `transform` or `opacity`; quantize CSS custom-property updates and skip unchanged values because they restyle every reader.
- Defer WebGL contexts, shader compilation and third-party runtimes with `useAfterLoad`/`<AfterLoad>` (`lib/hooks/use-after-load.ts`) because hydration work blocks already-painted DOM. The root `<Canvas>` waits for `window.load`; `force` opts out.
- WebGL draws on demand. A scene with its own animation calls `useHoldAwake(active)` from `lib/webgl/utils/awake.ts` while visible or the canvas freezes after about 2 seconds without changes. `<Canvas root render="always">` draws every frame for debugging. See `lib/webgl/README.md` § When the canvas draws.

### Design tokens and custom utilities

- Tokens: `lib/styles/css/root.css`; responsive `dr-*` utilities: `lib/styles/README.md`.
- Custom viewport functions: `mobile-vw()`, `mobile-vh()`, `desktop-vw()`, `desktop-vh()`; grid sizing: `columns(n)`.
- Desktop breakpoint: **800px**, defined in `lib/styles/config.ts`.

### State management

- Use React state (`useState`, `useReducer`) for component state and Zustand stores (for example, `lib/webgl/store.ts`) for global state.
- Use context for shared subtree state, shaped `{ state, actions, meta? }` and declared beside its provider (see `components/layout/theme/index.tsx`).

### Server Components by default

Add `'use client'` only for hooks, event handlers or browser APIs. Keep data fetching in Server Components and pass serializable props; interactive `components/ui/` primitives are client components, while `not-configured`, `not-found-view` and `sanity-image` remain server components.

### No manual memoization

React Compiler handles optimization. Never use `useMemo`, `useCallback` or `React.memo`; lint rejects them. Use `useRef` for class/object instantiation to prevent infinite loops. Compiler-recognized refs come from `useRef` or names ending in `Ref`; destructure object-carried refs such as `props.refs.panel` into an `xRef` because otherwise the compiler reads a mutable value and can skip optimization. See ARCHITECTURE.md § Code Patterns.

### WebGL cleanup

Dispose materials, textures, geometries and render targets on unmount; remove listeners; gate debug UI with `process.env.NODE_ENV === 'development'`.

Every WebGL surface uses `useDeviceDetection`'s `isWebGL` gate and a DOM fallback. It is false for software renderers (SwiftShader, llvmpipe), narrow viewports and touch-only devices (`isTouchOnly`: coarse pointer, no hover), including landscape phones and tablets past 800px. Cloud Lighthouse has no GPU; ungated shaders can peg its main thread and stop the audit.

### Fonts

`next/font` preloads every loaded family, competing with render-blocking CSS on slow links. Set `preload: false` for below-fold-only families. For licensed self-hosted fonts, subset to rendered characters: preload a base file (Basic Latin plus used punctuation), and declare an `-Ext` file (remaining Latin-1 and General Punctuation) with `unicode-range` so it downloads only when needed.

### Testing

- Prefer E2E as the sole test mechanism for complex behavior. Use Playwright (`e2e/*.e2e.ts`) and attach a screenshot/recording with `testInfo.attach()` or produce a report reproducible by rerun.
- Never write unit tests after code: they tend to assert implementation rather than required behavior.
- For isolated systems, list failure modes before coding and assert them. Existing unit tests cover CLI scripts (`setup:project`, `handoff`), configured-integration paths (E2E has no credentials), and cross-module invariants that E2E cannot reach.
- A test skips only for a dependency CI lacks; anything CI has fails when missing. Current skips:
  - `e2e/render-on-demand.e2e.ts`: software or missing WebGL2 (CI's SwiftShader); `E2E_GPU=1` runs it.
  - `e2e/route-sweep.e2e.ts`: routes in `OPT_OUT`, reason in the test name.
  - `e2e/secrets-in-bundle.e2e.ts`: locally, without the `leakcheck-*` values CI sets.
  - `lib/scripts/prerender-manifest.test.ts`: without a prior build, except in ci.yml's build job (`PRERENDER_MANIFEST_REQUIRED`).
  - `lib/scripts/setup-project.test.ts`: the chmod cases, as root.

### Git

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`; `lib/scripts/check-commit-msg.ts` rejects other first lines and lists allowed types.
- Do not force-push `main` or use `--no-verify` unless explicitly requested.

### Engineering rules

Comments calling a choice deliberate name its cost; otherwise they hide an unresolved trade-off.

Integration configuration has one answer across `lib/env.ts`, per-integration `env.ts` files and `lib/utils/validation.ts`. When modules cannot be shared, such as client/server dual-compiled `lib/integrations/sanity/env.ts`, tests assert they stay aligned. A shared module can still answer differently per side if fallbacks are not statically inlinable.

`setup:project` treats thrown and collected failures as blockers to self-prune. Required transforms with missing targets are collected, not skipped, so self-prune cannot delete the script needed to rerun after repair.

Ship every changed behavior claim with its fix in the changelog, README, JSDoc or audit ledger; otherwise inaccurate records hide incomplete fixes.

Worked patterns (compound components, context, server/client split, integration optionality, WebGL lifecycle, useRef instantiation) live in ARCHITECTURE.md § Code Patterns.

---

## Stack-Specific Notes

### React 19.3

- Use `<ViewTransition>` for page transitions and `startTransition` for local non-urgent changes. Shared names are unique among visible participants. The `global.css` page crossfade changes opacity only and works under reduced motion; put moving/resizing `::view-transition-*` rules inside `@media (--motion-ok)` because React does not disable them. Scroll entrances use `useReveal`, orchestration uses anime.js. See `components/layout/README.md` for contract and opt-out.
- Use `<Fragment ref={ref}>` to focus or observe sibling DOM nodes without a wrapper. A `FragmentInstance` is not an HTMLElement or anime.js target. The cart restores previous focus in Effect cleanup, including Strict Mode replay.
- Use `use(browser())` in a Client Component beneath Suspense when meaningful server HTML is impossible. `lib/features` combines it with lazy imports and independent boundaries; it does not replace code splitting or `useAfterLoad` window-load scheduling for GPU boot.
- A Server Component may render Context imported from a client module when its value is serializable. Remove only providers that forward data; Theme, Cart and GPU providers own client state/effects.
- Use `<Activity />` for off-screen tabs, carousels and accordions. Hidden content retains DOM/state, renders at lower priority and cleans up Effects, but pre-rendering still costs work and memory. `Tabs.Panel preserveState` activates it after Base UI exit; retain WebGL capability and load gates.
- `useEffectEvent` keeps event logic out of effect dependencies.
- Shopify passes `cacheSignal()` so an in-flight request is cancelled when its server render ends or aborts (`lib/integrations/shopify/client.ts`).
- Do not use `forwardRef`; React 19 refs are props and lint blocks the import.

### Caching

`cacheComponents` is off in `next.config.ts`; `partialPrefetching` and `cachedNavigations` require it. Pages without request-time reads prerender as static HTML; routes reading `params` without `generateStaticParams`, cookies or headers render per request. Cache per fetch, and use `revalidateTag()` in `POST /api/revalidate` to expire tagged static pages. Draft mode bypasses static pages and reads uncached. See ARCHITECTURE.md § Caching for the diagram.

- Do not use `'use cache'`, `cacheLife`, `cacheTag` or `export const instant`; they require `cacheComponents` and some fail the build while it is off. Route segment config (`dynamic`, `revalidate`) works.
- Set caching explicitly on cached fetches (`next: { revalidate, tags }` or `cache: 'force-cache'`): Next does not cache by default, and `next: { tags }` alone only caches during `next build`.
- A `GET` route handler is dynamic unless it exports `dynamic = 'force-static'` (see `app/llms.txt/route.ts`).
- Verify caching with `bun run build && bun run start`; dev renders every request and does not show cached behavior.

### Sanity content and caching

Read pages with `sanityFetch` (`lib/integrations/sanity/fetch.ts`); published reads use `sanityFetchPublished` (`lib/integrations/sanity/published.ts`) with tag `sanity` and a 30-day `revalidate` backstop. The signed publish webhook calls `revalidateTag('sanity', { expire: 0 })`. Draft mode uses the server-only `SANITY_API_READ_TOKEN`, the `sanity-preview-perspective` cookie, stega markers and uncached reads; `SanityVisualEditing` refreshes through `router.refresh()`.

- Read only through `sanityFetch` (pages, `generateMetadata`) or `sanityFetchPublished` (sitemap, `llms.txt`, outside page requests); direct client fetches bypass the intended cache and token boundary.
- Never prefix the token with `NEXT_PUBLIC_`; Next would inline it into the browser bundle.
- After schema or query changes, run `bun run sanity:extract` and `bun run sanity:typegen`; TypeGen uses `sanity.cli.ts`.

### Next.js 16 Request Proxy

`proxy.ts` handles the `SITE_PASSWORD` HTTP Basic gate on deployments except `next dev`; revalidation and draft-mode webhooks stay open, while `matcher`-skipped paths such as client chunks and `public/` files are never gated. It rate-limits `/api/*` through `@/utils/rate-limit`, except signed `/api/revalidate`, which uses its secret check. Security headers stay in `next.config.ts`, composed from registry `cspSources` by `lib/integrations/csp.ts` plus project origins in `PROJECT_CSP_EXTRA_SOURCES`; see `SECURITY.md`.

### Error boundaries

Keep `app/(site)/error.tsx` and `app/global-error.tsx` as direct shared `ErrorView` exports: Next's route convention provides the boundary, and `reset()` clears client state only. For component isolation use `catchError` from `next/error`, not a custom boundary: it preserves `notFound()`/`redirect()` and retries failed Server Components in place. Its fallback must not depend on `Wrapper`, which may have caused the failure.

Do not put `loading.tsx` or `<Suspense>` above `notFound()`: streaming starts with 200 before the check, returning 200 with noindex instead of 404. In `app/(site)/`, `loading.tsx` would cover `[...slug]` and every unmatched URL. Run checks before opening `<Suspense>`; `e2e/not-found.e2e.ts` asserts the 404 status.

`instrumentation.ts` reports render, route handler, server action and proxy errors through `onRequestError`. It logs JSON and POSTs to `ERROR_REPORT_URL` when set, using `ERROR_REPORT_TOKEN` as bearer auth. Include message, stack, digest, query-stripped path and route; never include headers, cookies or bodies. Next awaits delivery for up to 3 seconds; failures are logged and dropped, not retried. Replace the body to use a provider SDK; satus ships none.

### Tailwind v4

Configuration is CSS-first in `@theme`, not `tailwind.config.js`. Load `@import "tailwindcss"`; use `bg-(--brand-color)` for CSS variables, left-to-right stacked variants, `@utility` and `@variant` for custom utilities, built-in container queries, and slash opacity such as `bg-black/50`.

### Colors: always oklch (oklab for interpolation)

Author colors as `oklch()` in `lib/styles/colors.ts`, CSS modules, inline style strings and SVG fills. Do not use hex, `rgb()` or `hsl()` literals. Write alpha as `oklch(0 0 0 / 0.5)`, not `rgba()`.

- `lib/styles/colors.ts` is the palette source; `bun run setup:styles` generates theme CSS. Never hand-edit `lib/styles/css/tailwind.css` or `root.css`.
- Mix colors with `color-mix(in oklab, ...)`; gradients blending hues take an `oklab` interpolation hint (hard stops do not). JS mixing utilities return oklch strings.
- CSS keywords (`transparent`, `currentColor`, system colors) are allowed.
- GLSL in `lib/webgl/` is exempt because shader math uses linear RGB and `lib/webgl/utils/blend.ts` ports sRGB/HSL compositing specs; changing these to OKLab changes standard blend output. Comment any other non-oklch exception with the parser or spec that requires it.

---

## AI SEO (AEO)

Policy and mechanics live in `lib/seo/README.md`.

---

## Integrations

Integrations are optional and self-contained in `lib/integrations/{name}/`; see `lib/integrations/README.md`.

- Use `fetchWithTimeout` for external API calls (default 10s) to bound stalled requests.
- Read environment values through `import { env } from '@/lib/env'`, not `process.env`, for typed, validated configuration.
- Never commit plain-text secrets. Env files are encrypted with dotenvx (README § Environment variables), `lib/env-files.test.ts` enforces this, and every variable belongs in `.env.example`.
- Server actions return `{ status: number, message: string, fieldErrors?: Record<string, string> }`; client form validation reuses Zod schemas through `zodToValidator()`.
- Keep action result shapes distinct: form actions return UI state, Shopify cart actions return `CartActionResult = { ok: true } | { ok: false, error }` for optimistic UI, and API routes return `{ data, error }` (see `app/api/README.md`). Their consumers differ, so unifying them breaks the contract.

---

## Commands

```bash
bun dev              # Dev server (Turbopack)
bun run build        # Production build (runs setup:styles first)
bun run check        # oxlint + oxfmt --check + lint:types + ensure:typegen + tsc --noEmit + bun test + test:oxlint-plugin + manifest:check + check:assets + check:disables (must pass before pushing)
bun run check:disables  # lint-disable and @ts-ignore-style directives per rule must match lint-disables.json and carry a `-- <reason>`
bun lint             # oxlint
bun lint:fix         # oxlint with auto-fix
bun run lint:types   # oxlint type-aware rules (no-floating-promises, no-misused-promises)
bun run format       # oxfmt (writes in place; sorts imports + Tailwind classes)
bun run ensure:typegen  # runs `next typegen` unless next-env.d.ts and both .next/types files it imports are already there
bun run typecheck    # ensure:typegen + tsc --noEmit (TypeScript 7 native)
bun run typecheck:watch  # ensure:typegen + tsc --noEmit --watch (native fast watcher; live feedback)
bun test             # Unit tests (bun's built-in runner; ignores *.e2e.ts)
bun run test:e2e     # Playwright E2E smoke test (boots dev server automatically)
bun run setup:project  # Strip unused integrations (non-interactive: --preset/--keep, --yes, --clean-homepage, --skip-install, --dry-run)
bun run doctor       # Diagnose setup issues
```

The lefthook pre-commit hook runs oxfmt and oxlint --fix sequentially on staged files, alongside tsc typecheck. It omits type-aware linting to keep commits fast. The commit-msg hook enforces conventional subjects.

`next-env.d.ts` supplies ambient `.svg`/`.css` declarations from `lib/utils/types.d.ts`; it must be first in `tsconfig.json`'s `include`. A fresh clone lacks it, so `ensure:typegen` runs `next typegen` before typecheck/check. It verifies `next-env.d.ts`, `.next/types/routes.d.ts` and `.next/types/root-params.d.ts`, because the post-checkout hook deletes `.next/types`; once present, `bun run check` works before or after `bun run build`.

`e2e/route-sweep.e2e.ts` discovers every static `app/**/page.tsx` at collection and runs five smoke assertions. Dynamic routes (`[slug]`, `[...slug]`) need a bespoke `*.e2e.ts` with fixtures; write one for behavior beyond the smoke (see `e2e/not-found.e2e.ts`).

When verifying an absent-env fallback, wipe `.next` before building: `NEXT_PUBLIC_*` values are inlined at build time, so a stale build can silently test the configured variant.

---

## Documentation Map

| Document                                | Purpose                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `README.md`                             | Project overview, setup, project structure                                  |
| `PROD-README.md`                        | Production deployment notes                                                 |
| `ARCHITECTURE.md`                       | Architectural decisions, patterns, customization boundaries                 |
| `COMPONENTS.md`                         | Generated component, hook and utility inventory                             |
| `CHANGELOG.md`                          | Release history and versioning policy                                       |
| `SECURITY.md`                           | Security policy and vulnerability reporting                                 |
| `THIRD-PARTY-NOTICES.md`                | Third-party license attributions                                            |
| `app/README.md`                         | App Router structure, page patterns, Wrapper props                          |
| `app/api/README.md`                     | API route conventions and inventory                                         |
| `components/README.md`                  | Component inventory and conventions                                         |
| `components/layout/README.md`           | Header, footer and page wrapper architecture                                |
| `components/effects/README.md`          | Animation component docs                                                    |
| `components/ui/image/README.md`         | Image component API and WebGL integration                                   |
| `components/ui/real-viewport/README.md` | Real viewport unit hook and CSS variables                                   |
| `lib/README.md`                         | Library structure overview                                                  |
| `lib/seo/README.md`                     | AEO/SEO module, entity facts, JSON-LD, `/llms.txt`, `/ai`, markdown mirrors |
| `lib/integrations/README.md`            | Integration index, `setup:project` flags, adding an integration             |
| `lib/integrations/sanity/README.md`     | Sanity CMS integration docs                                                 |
| `lib/integrations/shopify/README.md`    | Shopify integration docs                                                    |
| `lib/integrations/hubspot/README.md`    | HubSpot integration docs                                                    |
| `lib/integrations/mailchimp/README.md`  | Mailchimp integration docs                                                  |
| `lib/integrations/turnstile/README.md`  | Turnstile integration docs                                                  |
| `lib/styles/README.md`                  | Design system and style generation                                          |
| `lib/styles/scripts/README.md`          | Style generation scripts                                                    |
| `lib/utils/README.md`                   | Shared utility inventory                                                    |
| `lib/webgl/README.md`                   | WebGL/R3F architecture, tunnel system, device gating                        |
| `lib/hooks/README.md`                   | Custom hook inventory                                                       |
| `lib/dev/README.md`                     | Debug tools suite (Orchestra)                                               |
| `lib/features/README.md`                | Optional feature loading for app layout                                     |

---

## Versioning

Semver is read from a fork's perspective; policy lives in `CHANGELOG.md`.

---

_Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)_
