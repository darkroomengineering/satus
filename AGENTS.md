# AGENTS.md - Satus Engineering Standards

This is the **single source of truth** for engineering standards in this repo. Claude Code, Cursor, and all other AI tools read this file. The other docs (`CLAUDE.md`, `.cursor/rules/`) are thin pointers back here.

This file changes only by deliberate review. `next dev` appends a managed block here (an HTML comment fencing `nextjs-agent-rules`) when it detects an AI coding agent; there is no config opt-out. Revert that block on sight, never commit it. This sentence must never contain the block's literal opening marker: Next locates the block by searching for that exact string, and a prose match makes the next `next dev` run truncate everything below it.

---

## Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Framework          | Next.js 16 (App Router, Cache Components, `proxy.ts`) |
| UI                 | React 19.2 (React Compiler ON, no manual memoization) |
| Language           | TypeScript 7, `strict: true`                          |
| Styling            | Tailwind v4 (CSS-first) + CSS Modules                 |
| Runtime            | Bun                                                   |
| Linter / Formatter | oxlint + oxfmt                                        |
| Validation         | Zod                                                   |
| Animation          | Lenis, GSAP, Tempus                                   |
| 3D (optional)      | React Three Fiber, `@react-three/drei`                |

---

## Enforced Rules (CI fails without these)

These are non-negotiable. Each is enforced by oxlint or TypeScript; `bun run check` and CI fail on violation; the pre-commit hook runs oxlint and tsc, and the two type-aware rules run only in `lint:types`, `check`, and CI (`next build` does not typecheck: `ignoreBuildErrors` is on).

### oxlint rules

| Rule                                 | What it catches                                                                                   | Enforcer                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `typescript/no-explicit-any`         | `any` types                                                                                       | oxlint `typescript`                |
| `typescript/consistent-type-imports` | Missing `import type` for type-only imports                                                       | oxlint `typescript` (`.ts`/`.tsx`) |
| `typescript/consistent-type-exports` | Missing `export type` for type-only re-exports                                                    | oxlint `typescript`, type-aware    |
| `nextjs/no-img-element`              | Raw `<img>` tags (use `@/components/ui/image`)                                                    | oxlint `nextjs`                    |
| `react/forbid-elements`              | Raw `<a>` tags (use `@/components/ui/link`)                                                       | oxlint `react`                     |
| `eslint/no-restricted-imports`       | `../../` deep relative imports (use `@/` aliases) and `forwardRef` imports (React 19 ref-as-prop) | oxlint `eslint`                    |
| `eslint/no-unused-vars`              | Unused imports, variables and parameters                                                          | oxlint `eslint`                    |
| `react/jsx-key`                      | Missing `key` in list renders                                                                     | oxlint `react` (`.tsx`/`.jsx`)     |
| `jsx-a11y/alt-text`                  | Missing `alt` on images (incl. next/image)                                                        | oxlint `jsx-a11y`                  |
| `react/button-has-type`              | `<button>` missing `type` attribute                                                               | oxlint `react`                     |
| `react/no-danger-with-children`      | XSS risk                                                                                          | oxlint `react`                     |
| `import/first`                       | Imports not at top of file                                                                        | oxlint `import`                    |
| `react/rules-of-hooks`               | Hooks called conditionally / outside components                                                   | oxlint `react`                     |
| `typescript/no-floating-promises`    | Un-awaited promises                                                                               | oxlint `typescript`, type-aware    |
| `typescript/no-misused-promises`     | Async function passed where void expected                                                         | oxlint `typescript`, type-aware    |

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
- Use `h-dvh` not `h-screen`
- Animate only `transform`, `opacity` (compositor properties)

### Animation

- **Reveal-on-scroll / entrance** → `useReveal` (`lib/hooks/use-reveal.ts`). CSS-driven, runs on the compositor thread so it stays smooth through hydration. Mark staggered children `data-reveal-item`; tune per container with `--reveal-transform`, `--reveal-stagger`, `--reveal-duration`. Degrades to visible with JS off; short-circuits under reduced-motion. The mechanism lives once in `global.css`.
- **Orchestration / scrubbing / pinning** → GSAP (timelines, ScrollTrigger via the Lenis bridge in `components/layout/lenis/`). GSAP's ticker is synced to Tempus (`components/effects/gsap.tsx`), so there's a single RAF loop. Don't reach for GSAP for simple reveals — that's main-thread work CSS does better off-thread. Write component animations with `useGSAP` from `@gsap/react`, passing `{ scope: ref }` — it scopes selector strings to that ref and reverts everything created inside it on unmount. Use its `contextSafe` wrapper for animations kicked off from event handlers, which otherwise run outside the scope. A bare `useEffect` + `gsap.to()` leaks tweens and ScrollTriggers across navigations.
- **Micro-interactions** (hover, toggle, ≤200ms) → CSS transitions.
- **Smooth scroll** → Lenis; **RAF scheduling** → Tempus.
- Honor reduced-motion: the global neutralizer in `global.css` zeroes CSS animation; JS/WebGL gates via `usePreferredReducedMotion`.

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

React Compiler handles all optimization. Never use `useMemo`, `useCallback`, or `React.memo`.

Exception: use `useRef` for class/object instantiation to prevent infinite loops (see ARCHITECTURE.md § Code Patterns).

### WebGL cleanup

Dispose materials, textures, geometries, and render targets on unmount. Remove event listeners. Gate debug UI with `process.env.NODE_ENV === 'development'`.

### Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- No force push to `main`; no `--no-verify` unless explicitly requested

### Rules the audits keep re-deriving

Four positions that repeated audits arrived at independently. Each exists because the alternative already shipped a bug.

**A comment that calls something deliberate must say what it costs.** Stating the intent alone is what let two real defects survive review: form actions verified Turnstile before rate limiting (documented as deliberate, never traced to the flood it invited), and the Sanity live module claimed published fetching was unaffected by a missing token (it was, in fact, entirely disabled). If you cannot name the cost you are accepting, the decision has not been made yet.

**"Is X configured" has one answer per integration.** `lib/env.ts`, the per-integration `env.ts` files, and the schemas in `lib/utils/validation.ts` each parse environment differently. They may not disagree. Where they cannot be merged — `lib/integrations/sanity/env.ts` is dual-compiled into the client bundle and must not import server-only code — a test asserts they stay in sync instead. Note that "reads the same module" is not sufficient on its own: a dual-compiled module answers differently per side when its fallbacks are not statically inlinable, which is how an alias-only Sanity config broke the front end and the Studio at once.

**Anything a scaffold step did not expect blocks self-prune.** `setup:project` has three failure modes — thrown, collected, and skipped — and only a thrown one used to stop the run. A required transform whose target file had been renamed was skipped in silence, and self-prune deleted the script even after transforms failed, so the documented advice to fix the cause and re-run had nothing left to run. New failure paths join the collected set; they do not get a fourth behaviour.

**Ship the claim with the fix.** Changelog, README, JSDoc, audit ledger: whatever states the old behaviour changes in the same diff. This is the rule with the worst track record — the changelog and a process-audit report both credited a PR with an EOF fix that only ever covered one of the three scripts it named, which made the gap invisible to anyone checking the record instead of the code.

Worked patterns (compound components, context, server/client split, integration optionality, WebGL lifecycle, useRef instantiation) are in `ARCHITECTURE.md` § Code Patterns.

---

## Stack-Specific Notes

### React 19.2

**`<Activity />`** - Manage off-screen visibility; defer updates for performance.

```tsx
import { Activity } from 'react'

;<Activity mode={isActive ? 'visible' : 'hidden'}>
  <ExpensiveComponent />
</Activity>
```

Good for: tabs, carousels, accordions, off-screen WebGL scenes. The component pre-renders without performance impact and automatically cleans up effects when hidden.

**`useEffectEvent`** - Separate event logic from effect dependencies.

```tsx
import { useEffect, useEffectEvent } from 'react'

function Component({ url, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme) // theme changes won't trigger reconnect
  })

  useEffect(() => {
    const connection = createConnection(url)
    connection.on('connected', onConnected)
    connection.connect()
    return () => connection.disconnect()
  }, [url]) // Only reconnects when url changes
}
```

**`cacheSignal`** (Server Components only) - Auto-aborts fetch on cache scope expiry.

```tsx
import { cacheSignal } from 'react'

async function fetchUserData(id: string) {
  const signal = cacheSignal()
  const response = await fetch(`/api/users/${id}`, { signal })
  return response.json()
}
```

The Shopify client passes `cacheSignal()` so in-flight requests are cancelled when the cache entry is dropped (`lib/integrations/shopify/client.ts`); `sanityFetch` relies on `cacheTag` alone.

**React 19 ref as prop** - No `forwardRef` needed.

```tsx
function Button({
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return <button ref={ref} {...props} />
}
```

### Next.js 16 Cache Components

Cache Components are enabled globally (`cacheComponents: true` in `next.config.ts`). Data is fetched inside `'use cache'` functions that call `cacheTag()` and `cacheLife()`; a webhook hits `POST /api/revalidate`, which calls `revalidateTag()` to drop the matching cache entries; `draftMode` bypasses the cache entirely. Every fetch goes through this tag-based model — this codebase has no other opt-out-of-caching mechanism. See ARCHITECTURE.md § Cache Components (Next.js 16) for the diagram.

Critical rules:

- Any fetch that calls `cacheTag()` (e.g. `sanityFetch`) MUST run inside a
  `'use cache'` function. Calling it in a bare Server Component throws
  `cacheTag() can only be called inside a "use cache" function`. Wrap the fetch
  in a small helper — `async function load() { 'use cache'; return sanityFetch(...) }` —
  and reuse it across the page body and `generateMetadata` (this also dedupes the
  request). See `lib/integrations/sanity/README.md`.
- Wrap cached components in `<Suspense>` boundaries with loading fallbacks
- Use `revalidateTag()` in webhook handlers (`POST /api/revalidate`)
- Test with hard refresh (bypasses router cache) AND normal navigation
- Dev and prod behave differently - test both

### Next.js 16 Request Proxy

`proxy.ts` at the project root handles cross-cutting request concerns — currently rate limiting for `/api/*` routes via `@/utils/rate-limit`. Security headers stay in `next.config.ts`, composed from the integration registry's `cspSources` by `lib/integrations/csp.ts`, plus project origins via `PROJECT_CSP_EXTRA_SOURCES` — details in `SECURITY.md`.

### Error boundaries

Route-segment errors are handled by the file convention: `app/(site)/error.tsx` and `app/global-error.tsx` render the shared `ErrorView`. Keep it that way — do not wrap those default exports in anything; the convention already provides the boundary, and its `reset()` only clears client state.

For **component-level** isolation (one widget failing without blanking the page — the starter has no such boundary today), the tool is `catchError` from `next/error` (stable since Next 16.3), not a hand-rolled React error boundary: it doesn't swallow `notFound()`/`redirect()` from the wrapped subtree, and its fallback receives `retry()`, which re-renders failed Server Components in place — something `reset()` cannot do. One constraint carries over from `global-error.tsx`: a fallback must not depend on `Wrapper` (Lenis/WebGL/theme are liable to be the thing that crashed).

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

ALL color values are authored in `oklch()` — palette entries in `lib/styles/colors.ts`, CSS module values, inline style strings, SVG fills. No hex, `rgb()`, or `hsl()` literals. Alpha uses slash syntax: `oklch(0 0 0 / 0.5)`, never `rgba()`.

- Palette source of truth is `lib/styles/colors.ts`; the theme CSS is generated from it by `bun run setup:styles`. Never hand-edit `lib/styles/css/tailwind.css` / `root.css`.
- All color mixing happens in `oklab`: `color-mix(in oklab, ...)` always (never `in srgb`), and gradients that blend across hues take an interpolation hint (`linear-gradient(to top in oklab, ...)`). Hard-stop gradients (adjacent stops at the same position) don't need one. Any future JS color-mixing utility must mix in OKLab/OKLCH and return oklch strings.
- CSS keywords (`transparent`, `currentColor`, system colors) remain fine.
- Sanctioned exceptions, each for a non-CSS parser or spec that cannot use oklch: `.storybook/manager.ts` (storybook/theming → polished), GLSL in `lib/webgl/` (shader math is linear RGB, not CSS — and the blend modes in `lib/webgl/utils/blend.ts` are ports of the compositing spec's sRGB/HSL definitions, so rewriting them in OKLab would change standard blend-mode output). Anything new that must stay non-oklch needs a comment stating which parser or spec forces it.

---

## AI SEO (AEO)

Policy and mechanics live in `lib/seo/README.md`.

---

## Integrations

All integrations are optional and self-contained in `lib/integrations/{name}/`. See `lib/integrations/README.md`.

- Always use `fetchWithTimeout` for external API calls (default 10s)
- Never use `process.env` directly - use `import { env } from '@/lib/env'` for typed, validated access
- Never commit secrets; document required vars in `.env.example`
- Server actions return `{ status: number, message: string, fieldErrors?: Record<string, string> }`
- Client form validation reuses the same Zod schemas via `zodToValidator()` bridge
- These are deliberate splits, not drift. Form actions (HubSpot, Mailchimp, Shopify customer) return `{ status, message, fieldErrors? }` because they are UI state consumed by a form hook, not an API response. Shopify cart actions return `CartActionResult = { ok: true } | { ok: false, error }` because they feed optimistic UI, not a form. API route handlers return `{ data, error }` — `error` is null on success and a message string on failure, `data` is the payload or null — see `app/api/README.md`. Don't unify these shapes.

---

## Commands

```bash
bun dev              # Dev server (Turbopack)
bun run build        # Production build (runs setup:styles first)
bun run check        # oxlint + oxfmt --check + lint:types + ensure:typegen + tsc --noEmit + bun test + test:oxlint-plugin + manifest:check + check:assets (must pass before pushing)
bun lint             # oxlint
bun lint:fix         # oxlint with auto-fix
bun run lint:types   # oxlint type-aware rules (no-floating-promises, no-misused-promises)
bun run format       # oxfmt (writes in place; sorts imports + Tailwind classes)
bun run ensure:typegen  # generates next-env.d.ts via `next typegen` if missing (skipped if it already exists)
bun run typecheck    # ensure:typegen + tsc --noEmit (TypeScript 7 native)
bun run typecheck:watch  # ensure:typegen + tsc --noEmit --watch (native fast watcher; live feedback)
bun test             # Unit tests (bun's built-in runner; ignores *.e2e.ts)
bun run test:e2e     # Playwright E2E smoke test (boots dev server automatically)
bun run setup:project  # Strip unused integrations (non-interactive: --preset/--keep, --yes, --clean-homepage, --skip-install, --dry-run)
bun run doctor       # Diagnose setup issues
```

Pre-commit hook (lefthook) runs on staged files: oxfmt + oxlint --fix (sequential, one command), in parallel with tsc typecheck. Type-aware linting is excluded from the hook to keep commits fast.

`next-env.d.ts` (gitignored) is what makes tsc resolve the ambient `.svg`/`.css` module declarations in `lib/utils/types.d.ts` — it's listed first in `tsconfig.json`'s `include`, and tsc needs that entry to exist for the rest of `include` to take effect. A byte-fresh clone has no `next-env.d.ts` (`next dev`/`next build` normally generate it), so `ensure:typegen` backfills it with `next typegen` — a route-type generation step, not a full build — before `typecheck`/`check` run. It's a no-op once the file exists, so `bun run check` is order-independent: run it before or after `bun run build`, doesn't matter.

Route smoke coverage is automatic: `e2e/route-sweep.e2e.ts` discovers every `app/**/page.tsx` at test-collection time and runs the five-assertion smoke against it with only static segments; dynamic routes (`[slug]`, `[...slug]`) need a bespoke `*.e2e.ts` with fixtures — creating the page is the only step for a static route. Write a bespoke `*.e2e.ts` only for behavior beyond the smoke (see `e2e/not-found.e2e.ts` for the soft-404 example).

When verifying behavior that depends on env vars being _absent_ (e.g. an integration's unconfigured fallback), wipe `.next` before building: `NEXT_PUBLIC_*` values are inlined at build time, so hiding `.env.local` against a stale build still renders the configured page and your verification silently measures the wrong variant. This burned a real review round — three contrast fixes "passed" env-hidden e2e against a build that had the env baked in.

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
