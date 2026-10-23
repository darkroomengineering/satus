# AGENTS.md - Satus Engineering Standards

This is the **single source of truth** for engineering standards in this repo. Claude Code, Codex, Cursor, and other AI tools read this file. `.cursor/rules/` is a thin pointer back here. Do not add a `CLAUDE.md`: while one exists, Claude Code skips loading this file.

This file changes only by deliberate review. When `next dev` detects an AI coding agent it appends a managed block here (an HTML comment fencing `nextjs-agent-rules`); `agentRules: false` in `next.config.ts` stops that. Keep it off. If the block ever shows up anyway, revert it, never commit it. This sentence must never contain the block's literal opening marker: Next locates the block by searching for that exact string, and a prose match makes the next `next dev` run truncate everything below it.

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

These are non-negotiable. Each is enforced by oxlint or TypeScript; `bun run check` and CI fail on violation; the pre-commit hook runs oxlint and tsc, and the two type-aware rules run only in `lint:types`, `check`, and CI (`next build` does not typecheck: `ignoreBuildErrors` is on).

### oxlint rules

| Rule                                 | What it catches                                                                                                                                                                                                                                                                                                                        | Enforcer                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `typescript/no-explicit-any`         | `any` types                                                                                                                                                                                                                                                                                                                            | oxlint `typescript`                |
| `typescript/consistent-type-imports` | Missing `import type` for type-only imports                                                                                                                                                                                                                                                                                            | oxlint `typescript` (`.ts`/`.tsx`) |
| `typescript/consistent-type-exports` | Missing `export type` for type-only re-exports                                                                                                                                                                                                                                                                                         | oxlint `typescript`, type-aware    |
| `nextjs/no-img-element`              | Raw `<img>` tags (use `@/components/ui/image`)                                                                                                                                                                                                                                                                                         | oxlint `nextjs`                    |
| `react/forbid-elements`              | Raw `<a>` tags (use `@/components/ui/link`)                                                                                                                                                                                                                                                                                            | oxlint `react`                     |
| `eslint/no-restricted-imports`       | `../../` deep relative imports (use `@/` aliases), `forwardRef` (React 19 ref-as-prop), `useMemo`/`useCallback`/`memo` (React Compiler), hamo `useMediaQuery` (use `useDeviceDetection`, or `desktop-only`/`mobile-only` for markup), `next/image` (use `@/components/ui/image`)                                                       | oxlint `eslint`                    |
| `hamo/no-raw-layout-read`            | `getBoundingClientRect`, `offset*`/`client*`/`scroll*` sizes, `window.scrollY`, `getComputedStyle` and other forced-layout reads (use hamo `useRect`, `useWindowSize`, `useResizeObserver`, or `lenis.scroll`)                                                                                                                         | `tools/oxlint/hamo`                |
| `hamo/no-raw-observer`               | `new ResizeObserver`/`IntersectionObserver`, `matchMedia`, window `resize`/`scroll` listeners (use the hamo hook, `useDeviceDetection`, or Lenis)                                                                                                                                                                                      | `tools/oxlint/hamo`                |
| `styling/no-class-string-variable`   | Tailwind class lists stored in a variable (plain, `cn()` result, or a variant map) or returned from a helper function; write them in `className`, extract a component, or use the CSS module. A stored list travels across files, and outside `cn()` it also skips oxfmt sorting and IntelliSense. Single-class values are not flagged | `tools/oxlint/styling`             |
| `eslint/no-unused-vars`              | Unused imports, variables and parameters                                                                                                                                                                                                                                                                                               | oxlint `eslint`                    |
| `react/jsx-key`                      | Missing `key` in list renders                                                                                                                                                                                                                                                                                                          | oxlint `react` (`.tsx`/`.jsx`)     |
| `jsx-a11y/alt-text`                  | Missing `alt` on images (incl. next/image)                                                                                                                                                                                                                                                                                             | oxlint `jsx-a11y`                  |
| `react/button-has-type`              | `<button>` missing `type` attribute                                                                                                                                                                                                                                                                                                    | oxlint `react`                     |
| `react/no-danger-with-children`      | XSS risk                                                                                                                                                                                                                                                                                                                               | oxlint `react`                     |
| `import/first`                       | Imports not at top of file                                                                                                                                                                                                                                                                                                             | oxlint `import`                    |
| `react/rules-of-hooks`               | Hooks called conditionally / outside components                                                                                                                                                                                                                                                                                        | oxlint `react`                     |
| `typescript/no-floating-promises`    | Un-awaited promises                                                                                                                                                                                                                                                                                                                    | oxlint `typescript`, type-aware    |
| `typescript/no-misused-promises`     | Async function passed where void expected                                                                                                                                                                                                                                                                                              | oxlint `typescript`, type-aware    |

A lint error is fixed in code, never disabled to get green. `bun run check:disables` (part of `bun run check`) counts every `oxlint-disable`/`eslint-disable` directive per rule, plus `@ts-ignore`, `@ts-expect-error` and `@ts-nocheck` under their own names, and fails when a count differs from `lint-disables.json` or a directive has no `-- <reason>` after the rule names (`// oxlint-disable-next-line rule -- why the rule is wrong here`). A new disable means raising that rule's number in `lint-disables.json` by hand, so the bump shows in the diff and the reviewer approves it; removing one means lowering it. An agent does not add a disable or raise a number on its own: it reports the error and the fix it could not find.

The `hamo` plugin (`tools/oxlint/hamo/`) sends layout reads and observers through hamo, which measures once per resize on a shared observer. A raw read forces layout, and inside a scroll or frame loop it does so every frame. Tests, e2e specs and `lib/scripts/**` are exempt.

A vendored plugin (`tools/oxlint/anti-slop/`, from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop)) adds rules against low-evidence TypeScript patterns: no `Reflect.get`/`Reflect.apply`, no `object`-typed parameters, no type aliases that merely rename `unknown`, no widen-then-assert flows, no module mocking in tests. All fifteen anti-slop rules run at `error`. Two unrelated rules (`eslint/prefer-named-capture-group`, `typescript/prefer-nullish-coalescing`) are off with their pre-existing finding counts documented in `oxlint.config.ts`; re-enable them one at a time as the findings are fixed. The plugin's own rule tests run under Node via `bun run test:oxlint-plugin`, not `bun test` — they're named `*.ruletest.ts` so bun's test discovery never collects them, because oxlint's RuleTester refuses the Bun runtime.

Tailwind class sorting and import ordering are handled by `oxfmt` at format time rather than by lint rules, so `bun run format` (or format-on-save) fixes them and they never fail `bun lint`. The two type-aware rules above only run under `bun run lint:types` (and `bun run check`) — they're not in the pre-commit hook, which keeps commits fast. See ARCHITECTURE.md § Linting and Formatting for why the toolchain is split this way.

### TypeScript strict flags (all active in `tsconfig.json`)

`strict`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`

### Path aliases (required, enforced by `eslint/no-restricted-imports`)

```tsx
import { Image } from '@/components/ui/image' // NOT next/image
import { Link } from '@/components/ui/link' // NOT next/link
import { useDeviceDetection } from '@/hooks/use-device-detection'
import { clamp } from '@/utils/math'
```

Named shortcut aliases: `@/hooks/*`, `@/styles/*`, `@/integrations/*`, `@/webgl/*`, `@/utils/*`, `@/config`, `@/dev`, `@/dev/*`. Everything else — including `@/components/*` and `@/lib/*` — resolves through the `@/*` root catch-all (`@/*` maps to the repo root in `tsconfig.json`, so e.g. `@/components/ui/link` resolves to `components/ui/link`).

---

## House Style (Darkroom conventions)

These are the subjective choices baked into this starter. A team forking satus can change any of these without breaking the build.

### Component file shape

```tsx
import s from './my-component.module.css' // CSS Modules imported as 's'
import cn from 'clsx'
import type { ComponentProps } from 'react'

interface MyComponentProps extends ComponentProps<'div'> {
  variant?: 'primary' | 'secondary'
}

export function MyComponent({
  variant = 'primary',
  className,
  ...props
}: MyComponentProps) {
  return <div className={cn(s.root, className)} {...props} />
}
```

- Named function declarations (not arrow functions) for components
- `interface` for object shapes, `type` for unions / intersections
- Props extend `ComponentProps<'element'>` when wrapping HTML elements
- Kebab-case filenames: `my-component.tsx`, `my-component.module.css`
- camelCase CSS class names: `.isPrimary`, `.isDisabled`

### Styling split

- Tailwind (~80%): spacing, colors, typography
- CSS Modules (~20%): complex animations, custom layouts, CSS specificity
- Combine with `cn()` from `clsx`
- No third way: a class list never lives in a variable, a map, a helper's return value or an exported constant (`styling/no-class-string-variable`). That includes a single class the rule can't flag: a repeated one-off becomes an `@utility`. Repeated markup becomes a component; repeated conditions stay inline in `cn()`
- A component that exposes `className` wraps its CSS module in `@layer components { ... }`. Tailwind v4 orders that layer below `utilities`, and unlayered CSS always beats layered CSS, so precedence becomes: consumer CSS module, then consumer Tailwind utility, then the component's own module. Without the layer an unlayered module rule beats every utility a consumer passes, whatever `cn()` outputs, and no class-merging library changes that. `image.module.css` layers into `utilities` on purpose so Tailwind `object-*` classes win by specificity; that is the one exception. This is why the starter does not carry `tailwind-merge`: the conflicts here are module versus utility, which layers decide, not utility versus utility.
- Use `h-svh` for documents and heroes, `h-dvh` only for app shells that track the browser toolbar; never `h-screen`
- Mobile Safari colors its status bar and bottom toolbar from fixed elements at the screen edges. `theme-color` covers installed web apps but not the browser, and takes one color. `<Wrapper safariEdges>` mounts two `aria-hidden` fixed strips (`components/layout/safari-edges`) colored by `--edge-top` / `--edge-bottom`, which default to `--color-primary`, so the page color runs behind both bars. Each edge is one solid color; it may change on scroll, but gradients and images can't extend behind the toolbars. Keep the strips outside any transformed ancestor, since a transform breaks `position: fixed`. Drawing under the notch also takes `viewportFit: 'cover'` in the route's `viewport` export and safe-area padding on edge-aligned content; satus leaves that off. Technique: [Seamless backgrounds on mobile Safari](https://joshpuckett.me/seamless-mobile-safari)
- Animate only `transform`, `opacity` (compositor properties)
- A below-fold CSS `background-image` downloads at page load on any rendered element, even at `opacity: 0` or inside a collapsed section; only `display: none` on the element itself, or a missing rule, prevents the fetch. Gate the class that carries the `url()` behind an IntersectionObserver (`rootMargin: '100% 0px'` starts the fetch one viewport early), or use `<img loading="lazy">`. Measured on shield.fi (2026-08-28): three hidden stills, 302 KB, cost 5.4 s of Slow 3G load before anyone scrolled.

### Animation

- **Reveal-on-scroll / entrance** → `useReveal` (`lib/hooks/use-reveal.ts`). CSS-driven, runs on the compositor thread so it stays smooth through hydration. Mark staggered children `data-reveal-item`; tune per container with `--reveal-transform`, `--reveal-stagger`, `--reveal-duration`. Degrades to visible with JS off; short-circuits under reduced-motion. The mechanism lives once in `global.css`.
- **Orchestration / scrubbing** → anime.js (`createTimeline`; `animate` with `autoplay: onScroll({ sync: true })` for scrubs; `splitText` for words). The Lenis bridge (`components/layout/lenis/anime.tsx`) runs anime's engine on Tempus after Lenis writes the scroll, so there's a single RAF loop and scrubs render the frame's own scroll position. Don't reach for anime.js for simple reveals — that's main-thread work CSS does better off-thread. Create animations in a `useEffect` from elements (anime selector strings are global, not scoped to a ref) and return their `revert()`, which restores inline styles and tears down a linked `onScroll`. A standalone `onScroll` needs its own `revert()`, an animation added to a shared timeline removes itself with `timeline.remove(target)`, and a `splitText` reverts its markup and every animation registered through `addEffect` (see `components/effects/progress-text`); anything not reverted leaks across navigations.
- **Pinning** → CSS `position: sticky` inside a taller parent; anime.js has no pin.
- **Micro-interactions** (hover, toggle, ≤200ms) → CSS transitions.
- **Smooth scroll** → Lenis; **RAF scheduling** → Tempus.
- Honor reduced-motion: movement is off, fades stay. Declare transform, height, and clip-path transitions inside `@media (--motion-ok)` (`prefers-reduced-motion: no-preference`); opacity and color transitions stay unconditional. Press feedback on buttons (`:active` scale) goes in `--motion-ok` too. JS/WebGL gates via `usePreferredReducedMotion`.
- Off screen is not paused. `opacity: 0` and a scrolled-away element still run their animations and frame writes, and pseudo-element animations restyle on the main thread. An infinite CSS animation starts `animation-play-state: paused` and runs only while its element is visible (a `data-*` attribute set from hamo's `useIntersectionObserver`); a frame loop skips writes while its element is hidden. `components/ui/marquee` gates its frame loop this way.
- Per-frame writes go to `transform` or `opacity`. Writing a CSS custom property every frame restyles every element that reads it; if a variable must change per frame, quantize it and skip the write when the value is unchanged.
- **Deferrable heavy boot** (WebGL contexts, shader compiles, third-party runtimes) → `useAfterLoad` / `<AfterLoad>` (`lib/hooks/use-after-load.ts`). Work done during hydration is billed as blocking time for pixels the DOM is already painting. The root `<Canvas>` already waits for `window.load`; `force` opts out.
- **WebGL draws on demand.** The root canvas stops drawing about 2 s after the last change (a placement that moved, a texture, a resize, tunnel content), so a scene that animates on its own (a `useFrame` spin, a time uniform) calls `useHoldAwake(active)` from `lib/webgl/utils/awake.ts` while it is on screen, or it freezes. `<Canvas root render="always">` draws every frame for debugging. See `lib/webgl/README.md` § When the canvas draws.

### Design tokens and custom utilities

- Design tokens: `lib/styles/css/root.css`
- `dr-*` utility classes for responsive scaling (see `lib/styles/README.md`)
- Custom viewport functions: `mobile-vw()`, `mobile-vh()`, `desktop-vw()`, `desktop-vh()`
- Column function: `columns(n)` for grid-based sizing
- Desktop breakpoint: **800px** (defined in `lib/styles/config.ts`)

### State management

- Component state: React built-in (`useState`, `useReducer`)
- Global state: Zustand (dedicated store files, e.g. `lib/webgl/store.ts`)
- Shared sub-tree state: standard context pattern (see Code Patterns below)
- Standard context shape: `{ state, actions, meta? }`, declared inline next to the provider (see `components/layout/theme/index.tsx`)

### Server Components by default

Only add `'use client'` when you need hooks, event handlers, or browser APIs. Keep data fetching in Server Components; pass serializable props down. Interactive `components/ui/` primitives are `'use client'`; presentational ones (`not-configured`, `not-found-view`, `sanity-image`) stay server components.

### No manual memoization

React Compiler handles all optimization. Never use `useMemo`, `useCallback`, or `React.memo`; importing them is a lint error.

Exception: use `useRef` for class/object instantiation to prevent infinite loops (see ARCHITECTURE.md § Code Patterns).

The compiler recognizes a ref only when it comes from `useRef` or its name ends in `Ref`. A ref carried inside an object (`props.refs.panel`, `{ el }`) reads as a mutable value, and the compiler can skip optimizing the component. Destructure it into an `xRef` name before use.

### WebGL cleanup

Dispose materials, textures, geometries, and render targets on unmount. Remove event listeners. Gate debug UI with `process.env.NODE_ENV === 'development'`.

`isWebGL` from `useDeviceDetection` is false on software renderers (SwiftShader, llvmpipe), not just on devices without WebGL2. It is also false on narrow viewports and on touch-only devices (`isTouchOnly`: coarse pointer, no hover) at any width, so a phone in landscape or a tablet past the 800px breakpoint gets the DOM fallback. PageSpeed Insights and other cloud Lighthouse runners have no GPU; a shader that runs there pegs the main thread for the whole audit and the report comes back as "page stopped responding". Anything that mounts a WebGL surface must go through that gate or the DOM fallback never gets exercised where it matters.

### Fonts

`next/font` preloads every family it loads. Preloads compete with the render-blocking stylesheet on a slow link, so a family used only below the fold should pass `preload: false` (measured on shield.fi, 2026-08-28: dropping one below-fold preload moved Slow 3G first paint from 3.8 s to 3.0 s). For licensed self-hosted fonts, subset to the characters the site renders: a preloaded base file (Basic Latin plus the punctuation in use) and an `-Ext` file (rest of Latin-1, General Punctuation) declared with a `unicode-range` so it downloads only when one of those characters renders.

### Testing

- **Highly prefer E2E tests as the sole testing mechanism.** Use them (Playwright, `e2e/*.e2e.ts`) to verify that complex features work. At the end of an E2E test, produce a verifiable and repeatable artifact: a screenshot or recorded output attached with `testInfo.attach()`, or a report that a rerun reproduces.
- **Never write unit tests after you write code.** A unit test written to fit finished code asserts what the code does, not what it must do, so it rarely catches a real bug.
- **If you must test a system in isolation, first write down all the ways it could fail, then write the code.** The isolated tests assert against that list. The unit tests that remain in this repo cover what E2E cannot reach: CLI scripts (`setup:project`, `handoff`), configured-integration paths (E2E runs without credentials), and cross-module invariants.
- **A test skips only for a dependency CI lacks; anything CI has fails when missing.** Current skips:
  - `e2e/render-on-demand.e2e.ts`: software or missing WebGL2 (CI's SwiftShader); `E2E_GPU=1` runs it.
  - `e2e/route-sweep.e2e.ts`: routes in `OPT_OUT`, reason in the test name.
  - `e2e/secrets-in-bundle.e2e.ts`: locally, without the `leakcheck-*` values CI sets.
  - `lib/scripts/prerender-manifest.test.ts`: locally, without a prior build.
  - `lib/scripts/setup-project.test.ts`: the chmod cases, as root.

### Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- No force push to `main`; no `--no-verify` unless explicitly requested
- The `commit-msg` hook (`lib/scripts/check-commit-msg.ts`) enforces the conventional format and lists the allowed types when it rejects a message

### Rules the audits keep re-deriving

Four positions that repeated audits arrived at independently. Each exists because the alternative already shipped a bug.

**A comment that calls something deliberate must say what it costs.** Stating the intent alone is what let two real defects survive review: form actions verified Turnstile before rate limiting (documented as deliberate, never traced to the flood it invited), and the Sanity live module claimed published fetching was unaffected by a missing token (it was, in fact, entirely disabled). If you cannot name the cost you are accepting, the decision has not been made yet.

**"Is X configured" has one answer per integration.** `lib/env.ts`, the per-integration `env.ts` files, and the schemas in `lib/utils/validation.ts` each parse environment differently. They may not disagree. Where they cannot be merged — `lib/integrations/sanity/env.ts` is dual-compiled into the client bundle and must not import server-only code — a test asserts they stay in sync instead. Note that "reads the same module" is not sufficient on its own: a dual-compiled module answers differently per side when its fallbacks are not statically inlinable, which is how an alias-only Sanity config broke the front end and the Studio at once.

**Anything a scaffold step did not expect blocks self-prune.** `setup:project` has three failure modes — thrown, collected, and skipped — and only thrown and collected failures stop self-prune. A required transform whose target is missing therefore reports as collected, not skipped: a silent skip lets self-prune delete the script, leaving nothing to re-run once the cause is fixed. New failure paths join the collected set; they do not get a fourth behaviour.

**Ship the claim with the fix.** Changelog, README, JSDoc, audit ledger: whatever states the old behaviour changes in the same diff. This is the rule with the worst track record — the changelog and a process-audit report both credited a PR with an EOF fix that only ever covered one of the three scripts it named, which made the gap invisible to anyone checking the record instead of the code.

Worked patterns (compound components, context, server/client split, integration optionality, WebGL lifecycle, useRef instantiation) are in `ARCHITECTURE.md` § Code Patterns.

---

## Stack-Specific Notes

### React 19.3

**`<ViewTransition>`** — Stable in 19.3. `Wrapper` crossfades page main content;
the Sanity example scopes a Suspense reveal inside the page. Next.js 16.3 navigation starts
transitions without a config flag. Use `startTransition` for local non-urgent
state changes. Shared names must be unique among visible participants. The page
crossfade in `global.css` is opacity-only, so it keeps running under reduced
motion; any `::view-transition-*` rule that moves or resizes goes inside
`@media (--motion-ok)`, since React does not disable it. Scroll entrances stay on `useReveal`, orchestration
on anime.js. See `components/layout/README.md` for the contract and opt-out.

**Fragment refs** — Use `<Fragment ref={ref}>` for focus or observation across
sibling DOM nodes without adding a wrapper. A `FragmentInstance` is not an
HTMLElement or an anime.js target. The cart uses one for initial focus and restores
the previous focus in Effect cleanup, including Strict Mode replay.

**`use(browser())`** — Call in a Client Component beneath Suspense when it
cannot render meaningful server HTML. `lib/features` combines this with lazy
imports and independent boundaries. It does not replace code splitting or
`useAfterLoad`'s window-load scheduling for GPU boot.

**Context from Server Components** — A Server Component may render a Context
imported from a client module with a serializable value. Remove a provider
wrapper only when it merely forwards data; Theme, Cart and GPU providers still
own client state/effects and stay client components.

**`<Activity />`** - Manage off-screen visibility; defer updates for performance.

```tsx
import { Activity } from 'react'

;<Activity mode={isActive ? 'visible' : 'hidden'}>
  <ExpensiveComponent />
</Activity>
```

Good for: tabs, carousels and accordions. Hidden content retains state and DOM,
renders at lower priority and cleans up Effects; pre-rendering still costs work
and memory. `Tabs.Panel preserveState` opts into this after Base UI's exit
completes. Retain explicit WebGL capability and load gates.

**`useEffectEvent`** keeps event logic out of effect dependencies.

**`cacheSignal()`** — The Shopify client passes it so an in-flight request is cancelled when the server render it belongs to ends or is aborted (`lib/integrations/shopify/client.ts`).

**Ref as prop** — No `forwardRef` (the lint rule above blocks the import).

### Caching

`cacheComponents` is off in `next.config.ts`, and with it `partialPrefetching` and `cachedNavigations`, which need it. Pages without request-time reads are prerendered as static HTML; routes that read `params` without `generateStaticParams`, cookies or headers render per request. Data is cached per fetch: a cached read passes `next: { tags, revalidate }` (or `cache: 'force-cache'` with the tags); tags alone are not cached at request time. A webhook hits `POST /api/revalidate`, which calls `revalidateTag()` to expire the tag and every static page built from it. Draft mode bypasses the static pages and reads uncached. See ARCHITECTURE.md § Caching for the diagram.

Rules:

- No `'use cache'`, `cacheLife`, `cacheTag` or `export const instant`: they need `cacheComponents` (`'use cache'` and `instant` fail the build without it). Route segment config (`dynamic`, `revalidate`) works again.
- A cached fetch sets its caching explicitly (`next: { revalidate, tags }` or `cache: 'force-cache'`). Next does not cache a fetch by default: with `next: { tags }` alone it is cached only during `next build`, and every render after that refetches.
- A `GET` route handler is dynamic unless it exports `dynamic = 'force-static'` (see `app/llms.txt/route.ts`).
- Test with a production build (`bun run build && bun run start`): dev renders every request and never shows the cached behavior.

### Sanity content and caching

There is no Sanity Live. Pages read through `sanityFetch` (`lib/integrations/sanity/fetch.ts`), which sets its own caching: published reads go through `sanityFetchPublished` (`published.ts`), a fetch tagged `sanity` with a 30-day `revalidate` backstop. A signed publish webhook hits `POST /api/revalidate`, which calls `revalidateTag('sanity', { expire: 0 })`, so the next visit gets fresh content. Draft mode (the Studio's Presentation tool) reads with the server-only Viewer token `SANITY_API_READ_TOKEN` in the perspective Presentation picks (drafts, or a content release, from the `sanity-preview-perspective` cookie), with stega markers, uncached; `SanityVisualEditing` refreshes the preview through `router.refresh()`.

Critical rules:

- Read content only through `sanityFetch` (pages, `generateMetadata`) or `sanityFetchPublished` (sitemap, `llms.txt`, anything outside a page request). Never fetch with the client directly.
- Never give the token a `NEXT_PUBLIC_` name: that inlines it into the browser bundle.
- Run `bun run sanity:extract` and `bun run sanity:typegen` after schema or query changes. Typegen is configured in `sanity.cli.ts`.

### Next.js 16 Request Proxy

`proxy.ts` at the project root handles cross-cutting request concerns: the password gate (HTTP Basic auth on every deployment except `next dev` while `SITE_PASSWORD` is set; the revalidation and draft-mode webhooks stay open, and paths the `matcher` skips, such as client chunks and `public/` files, are never gated) and rate limiting for `/api/*` routes via `@/utils/rate-limit`, except the signed revalidation webhook (`/api/revalidate`), which its secret check gates instead. Security headers stay in `next.config.ts`, composed from the integration registry's `cspSources` by `lib/integrations/csp.ts`, plus project origins via `PROJECT_CSP_EXTRA_SOURCES` — details in `SECURITY.md`.

### Error boundaries

Route-segment errors are handled by the file convention: `app/(site)/error.tsx` and `app/global-error.tsx` render the shared `ErrorView`. Keep it that way — do not wrap those default exports in anything; the convention already provides the boundary, and its `reset()` only clears client state.

For **component-level** isolation (one widget failing without blanking the page — the starter has no such boundary today), the tool is `catchError` from `next/error` (stable since Next 16.3), not a hand-rolled React error boundary: it doesn't swallow `notFound()`/`redirect()` from the wrapped subtree, and its fallback receives `retry()`, which re-renders failed Server Components in place — something `reset()` cannot do. One constraint carries over from `global-error.tsx`: a fallback must not depend on `Wrapper` (Lenis/WebGL/theme are liable to be the thing that crashed).

No Suspense boundary (a `loading.tsx` or an in-page `<Suspense>`) above a `notFound()` call. Streaming starts the response with a 200 before `notFound()` runs, so the URL comes back 200 with a noindex tag instead of a 404. A `loading.tsx` at `app/(site)/` would sit above `[...slug]`, which catches every unmatched URL, so none goes there. For a skeleton, run the `notFound()` checks first and open the `<Suspense>` after them. `e2e/not-found.e2e.ts` asserts the 404 status.

Server errors (render, route handler, server action, proxy) reach `onRequestError` in `instrumentation.ts`, which logs one JSON line and, when `ERROR_REPORT_URL` is set, POSTs the same JSON there (`ERROR_REPORT_TOKEN` goes out as a bearer token). The report holds the message, stack, digest, path without its query string, and route; never add headers, cookies or bodies to it. Next awaits the hook, so a slow receiver holds the response for up to the 3 s timeout, and a failed delivery is logged and dropped, not retried. To use a provider SDK (Sentry, Axiom), replace the body of `instrumentation.ts`; satus ships no SDK.

### Tailwind v4

Configuration is CSS-first - no `tailwind.config.js`. Use `@theme` directive in CSS:

```css
@import 'tailwindcss';

@theme {
  --font-display: 'Satoshi', 'sans-serif';
  --breakpoint-3xl: 1920px;
  --color-brand: oklch(0.84 0.18 117.33);
}
```

Tailwind v4 conventions:

- Load Tailwind with `@import "tailwindcss"`
- CSS variables in arbitrary values: `bg-(--brand-color)`, not `bg-[--brand-color]`
- Stacked variants apply left-to-right
- Custom utilities via `@utility`, custom variants via `@variant`
- Container queries are built-in (no plugin)
- Opacity via slash syntax: `bg-black/50`

### Colors: always oklch (oklab for interpolation)

All color values are authored in `oklch()` — palette entries in `lib/styles/colors.ts`, CSS module values, inline style strings, SVG fills. No hex, `rgb()`, or `hsl()` literals. Alpha uses slash syntax: `oklch(0 0 0 / 0.5)`, never `rgba()`.

- Palette source of truth is `lib/styles/colors.ts`; the theme CSS is generated from it by `bun run setup:styles`. Never hand-edit `lib/styles/css/tailwind.css` / `root.css`.
- All color mixing happens in `oklab`: `color-mix(in oklab, ...)` always (never `in srgb`), and gradients that blend across hues take an interpolation hint (`linear-gradient(to top in oklab, ...)`). Hard-stop gradients (adjacent stops at the same position) don't need one. Any future JS color-mixing utility must mix in OKLab/OKLCH and return oklch strings.
- CSS keywords (`transparent`, `currentColor`, system colors) remain fine.
- Sanctioned exceptions, each for a non-CSS parser or spec that cannot use oklch: GLSL in `lib/webgl/` (shader math is linear RGB, not CSS — and the blend modes in `lib/webgl/utils/blend.ts` are ports of the compositing spec's sRGB/HSL definitions, so rewriting them in OKLab would change standard blend-mode output). Anything new that must stay non-oklch needs a comment stating which parser or spec forces it.

---

## AI SEO (AEO)

Policy and mechanics live in `lib/seo/README.md`.

---

## Integrations

All integrations are optional and self-contained in `lib/integrations/{name}/`. See `lib/integrations/README.md`.

- Always use `fetchWithTimeout` for external API calls (default 10s)
- Never use `process.env` directly - use `import { env } from '@/lib/env'` for typed, validated access
- Never commit secrets in plain text. Env files are committed encrypted with dotenvx (README § Environment variables); `lib/env-files.test.ts` enforces it. Document every var in `.env.example`
- Server actions return `{ status: number, message: string, fieldErrors?: Record<string, string> }`
- Client form validation reuses the same Zod schemas via `zodToValidator()` bridge
- These are deliberate splits, not drift. Form actions (HubSpot, Mailchimp, Shopify customer) return `{ status, message, fieldErrors? }` because they are UI state consumed by a form hook, not an API response. Shopify cart actions return `CartActionResult = { ok: true } | { ok: false, error }` because they feed optimistic UI, not a form. API route handlers return `{ data, error }` — `error` is null on success and a message string on failure, `data` is the payload or null — see `app/api/README.md`. Don't unify these shapes.

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

Pre-commit hook (lefthook) runs on staged files: oxfmt + oxlint --fix (sequential, one command), in parallel with tsc typecheck. Type-aware linting is excluded from the hook to keep commits fast. The commit-msg hook rejects a message whose first line is not a conventional commit subject.

`next-env.d.ts` (gitignored) is what makes tsc resolve the ambient `.svg`/`.css` module declarations in `lib/utils/types.d.ts` — it's listed first in `tsconfig.json`'s `include`, and tsc needs that entry to exist for the rest of `include` to take effect. A byte-fresh clone has no `next-env.d.ts` (`next dev`/`next build` normally generate it), so `ensure:typegen` backfills it with `next typegen` — a route-type generation step, not a full build — before `typecheck`/`check` run. `next-env.d.ts` also imports `.next/types/routes.d.ts` and `.next/types/root-params.d.ts`, and the post-checkout hook deletes `.next/types` on every branch switch, so `ensure:typegen` checks all three files and regenerates when any is missing. It's a no-op once they exist, so `bun run check` is order-independent: run it before or after `bun run build`, doesn't matter.

Route smoke coverage is automatic: `e2e/route-sweep.e2e.ts` discovers every `app/**/page.tsx` at test-collection time and runs the five-assertion smoke against it with only static segments; dynamic routes (`[slug]`, `[...slug]`) need a bespoke `*.e2e.ts` with fixtures — creating the page is the only step for a static route. Write a bespoke `*.e2e.ts` only for behavior beyond the smoke (see `e2e/not-found.e2e.ts` for the 404 status example).

When verifying behavior that depends on env vars being _absent_ (e.g. an integration's unconfigured fallback), wipe `.next` before building: `NEXT_PUBLIC_*` values are inlined at build time, so hiding `.env.local` against a stale build still renders the configured page and your verification silently measures the wrong variant.

---

## Documentation Map

| Document                                | Purpose                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------- |
| `README.md`                             | Project overview, setup, project structure                                  |
| `PROD-README.md`                        | Production deployment notes                                                 |
| `ARCHITECTURE.md`                       | Architectural decisions, patterns, and customization boundaries             |
| `COMPONENTS.md`                         | Auto-generated component / hook / utility inventory                         |
| `CHANGELOG.md`                          | Release history and versioning policy                                       |
| `SECURITY.md`                           | Security policy and vulnerability reporting                                 |
| `THIRD-PARTY-NOTICES.md`                | Third-party license attributions                                            |
| `app/README.md`                         | App Router structure, page patterns, Wrapper props                          |
| `app/api/README.md`                     | API route conventions and inventory                                         |
| `components/README.md`                  | Component inventory and conventions                                         |
| `components/layout/README.md`           | Header, footer, and page wrapper architecture                               |
| `components/effects/README.md`          | Animation component docs                                                    |
| `components/ui/image/README.md`         | Image component API and WebGL integration                                   |
| `components/ui/real-viewport/README.md` | Real viewport unit hook and CSS variables                                   |
| `lib/README.md`                         | Library structure overview                                                  |
| `lib/seo/README.md`                     | AEO/SEO module: entity facts, JSON-LD, `/llms.txt`, `/ai`, markdown mirrors |
| `lib/integrations/README.md`            | Integration index, `setup:project` flags, adding a new integration          |
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
| `lib/features/README.md`                | Optional feature loading for the app layout                                 |

---

## Versioning

Semver read from a fork's perspective; full policy and history in `CHANGELOG.md`.

---

_Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)_
