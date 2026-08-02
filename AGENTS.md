# AGENTS.md - Satus Engineering Standards

This is the **single source of truth** for engineering standards in this repo. Claude Code, Cursor, and all other AI tools read this file. The other docs (`CLAUDE.md`, `.cursor/rules/`) are thin pointers back here.

---

## Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Framework          | Next.js 16 (App Router, Cache Components, `proxy.ts`) |
| UI                 | React 19.2 (React Compiler ON, no manual memoization) |
| Language           | TypeScript 6, `strict: true`                          |
| Styling            | Tailwind v4 (CSS-first) + CSS Modules                 |
| Runtime            | Bun                                                   |
| Linter / Formatter | oxlint + oxfmt                                        |
| Validation         | Zod                                                   |
| Animation          | Lenis, GSAP, Tempus                                   |
| 3D (optional)      | React Three Fiber, `@react-three/drei`                |

---

## Enforced Rules (CI fails without these)

These are non-negotiable. Each is enforced by oxlint or TypeScript; the build or pre-commit hook will fail on violation.

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

Tailwind class sorting and import ordering are handled by `oxfmt` at format time rather than by lint rules, so `bun run format` (or format-on-save) fixes them and they never fail `bun lint`. The two type-aware rules above only run under `bun run lint:types` (and `bun run check`) — they're not in the pre-commit hook, which keeps commits fast. See ARCHITECTURE.md § Linting and Formatting for why the toolchain is split this way.

### TypeScript strict flags (all active in `tsconfig.json`)

`strict`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`

### Path aliases (required, enforced by `no-relative-parent-imports`)

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
- **Orchestration / scrubbing / pinning** → GSAP (timelines, ScrollTrigger via the Lenis bridge in `components/layout/lenis/`). GSAP's ticker is synced to Tempus (`components/effects/gsap.tsx`), so there's a single RAF loop. Don't reach for GSAP for simple reveals — that's main-thread work CSS does better off-thread.
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
- Standard context shape: `{ state, actions, meta? }` via `lib/utils/context.ts`

### Server Components by default

Only add `'use client'` when you need hooks, event handlers, or browser APIs. Keep data fetching in Server Components; pass serializable props down. All `components/ui/` primitives are `'use client'`.

### No manual memoization

React Compiler handles all optimization. Never use `useMemo`, `useCallback`, or `React.memo`.

Exception: use `useRef` for class/object instantiation to prevent infinite loops (see Code Patterns).

### WebGL cleanup

Dispose materials, textures, geometries, and render targets on unmount. Remove event listeners. Gate debug UI with `process.env.NODE_ENV === 'development'`.

### Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- No force push to `main`; no `--no-verify` unless explicitly requested

---

## Code Patterns

### 1. Compound Component

UI primitives wrap `@base-ui/react` with project styling. Two patterns:

**Pattern A - Namespace + named exports** (Accordion, Tabs):

```tsx
'use client'
import { Collapsible } from '@base-ui/react/collapsible'
import cn from 'clsx'
import s from './accordion.module.css'

function Root({ children, className, ...props }: RootProps) {
  return (
    <Collapsible.Root className={cn(s.accordion, className)} {...props}>
      {children}
    </Collapsible.Root>
  )
}

export { Body, Button, Group, Root }
export const Accordion = { Group, Root, Button, Body }
```

**Pattern B - Function properties** (Tooltip, Checkbox, Switch):

```tsx
function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  /* simple API */
}
Tooltip.Root = BaseTooltip.Root
Tooltip.Popup = Popup
export { Tooltip }
```

Rules: always pass `className` through as `cn(s.root, className)`, spread `{...props}` for extensibility, provide both simple and compound API.

### 2. CSS Modules + Tailwind Hybrid

```tsx
import s from './component.module.css'
import cn from 'clsx'

<div className="flex items-center gap-4 p-2">              {/* Tailwind only */}
<div className={s.animatedPanel}>                           {/* Module only */}
<div className={cn(s.root, 'p-4', className)}>             {/* Combined */}
```

### 3. Context Pattern

Shared contexts (theme, cart, form) use a typed `createContext` with a
`{ state, actions, meta? }` value shape, plus a hook that throws when used
outside the provider. See `components/layout/theme/index.tsx` for the
reference implementation.

```tsx
interface MyState {
  count: number
}
interface MyActions {
  increment: () => void
}
type MyContextValue = { state: MyState; actions: MyActions }

const MyContext = createContext<MyContextValue | null>(null)

function useMyComponent(): MyContextValue {
  const context = use(MyContext)
  if (!context) throw new Error('useMyComponent must be used within MyProvider')
  return context
}

function MyProvider({ children }: PropsWithChildren) {
  const [count, setCount] = useState(0)
  return (
    <MyContext.Provider
      value={{
        state: { count },
        actions: { increment: () => setCount((c) => c + 1) },
      }}
    >
      {children}
    </MyContext.Provider>
  )
}
```

For component-scoped contexts, inline `createContext` + `useContext` is fine.

### 4. Server vs Client Split

```tsx
// product-page.tsx - Server Component (no directive)
export default async function ProductPage({
  params,
}: {
  params: { slug: string }
}) {
  const data = await fetchProduct(params.slug)
  return <ProductView product={data} /> // serializable props only
}

// product-view.tsx - Client Component
;('use client')
export function ProductView({ product }: { product: Product }) {
  const [qty, setQty] = useState(1)
}
```

`'use client'` goes on the first line, before imports.

### 5. Integration Optionality

```tsx
import { isConfigured } from '@/integrations/registry'
import { NotConfigured } from '@/components/ui/not-configured'

export default async function SanityPage() {
  if (!isConfigured('sanity')) {
    return <NotConfigured integration="Sanity" />
  }
  // ... normal page logic
}
```

Available checks: `isConfigured('sanity' | 'shopify' | 'hubspot' | 'mailchimp' | 'turnstile')`.

Adding a new integration: add its Zod schema to `@/utils/validation`, add one entry to `lib/integrations/registry.ts`. The `doctor.ts` and listing helpers derive automatically. See `lib/integrations/README.md`.

Validate external API _responses_ at the boundary, not just env config. Pass
untrusted upstream JSON (GraphQL envelopes, REST payloads) through
`parseApiResponse(schema, data, context)` (`@/utils/validation`) so a malformed
response fails clearly at the edge with context instead of crashing downstream.
The Shopify, HubSpot, and Mailchimp clients all do this.

### 6. WebGL Element Lifecycle

DOM-synced WebGL via tunnel system. A single root canvas (`<Canvas root>`)
hosts the scene — mounted either in the shared layout (`lib/features`, persists
across routes) or per page via `<Wrapper webgl>`. Pick one strategy.

```
<Canvas root> (layout OR <Wrapper webgl>) -> WebGLTunnel.Out, DOMTunnel.Out
Page -> <WebGLTunnel> (portals 3D content up into the root canvas)
```

```tsx
// DOM side
'use client'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'
import { WebGLTunnel } from '@/webgl/components/tunnel'

function MyWebGLComponent({ className }: { className?: string }) {
  const { setRef, rect, isVisible } = useWebGLElement()
  return (
    <div ref={setRef} className={className}>
      <WebGLTunnel>
        <MyMesh rect={rect} visible={isVisible} />
      </WebGLTunnel>
    </div>
  )
}
```

`WebGLTunnel` (and `DOMTunnel`, for HTML overlays) already wrap `useCanvas()`
internally — this is the intended public API. Reach for `useCanvas()` directly
only as a low-level escape hatch, e.g. building a new portal primitive. See
`lib/webgl/README.md`.

Always dispose GPU resources (materials, textures, geometries, render targets) on unmount.

### 7. useRef for Object Instantiation

```tsx
// Persistent instances (compiler cannot optimize class instantiation)
const instanceRef = useRef<MyClass | null>(null)
if (!instanceRef.current) {
  instanceRef.current = new MyClass()
}

// Three.js objects with cleanup
const [material] = useState(() => new MeshBasicMaterial())
useEffect(() => () => material.dispose(), [material])
```

The compiler handles simple calculations and callbacks automatically - no manual memoization needed.

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

All `sanityFetch` calls include `cacheSignal()` automatically.

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

Cache Components are enabled globally (`cacheComponents: true` in `next.config.ts`).

| Data type                       | Cache strategy                                         |
| ------------------------------- | ------------------------------------------------------ |
| Public content                  | ISR with `revalidate`, inside a `'use cache'` function |
| User-specific (carts, accounts) | `cache: 'no-store'` - never cache                      |
| Real-time (live feeds, prices)  | `cache: 'no-store'`                                    |

Critical rules:

- Any fetch that calls `cacheTag()` (e.g. `sanityFetch`) MUST run inside a
  `'use cache'` function. Calling it in a bare Server Component throws
  `cacheTag() can only be called inside a "use cache" function`. Wrap the fetch
  in a small helper — `async function load() { 'use cache'; return sanityFetch(...) }` —
  and reuse it across the page body and `generateMetadata` (this also dedupes the
  request). See `lib/integrations/sanity/README.md`.
- Wrap cached components in `<Suspense>` boundaries with loading fallbacks
- Use `revalidateTag()` / `revalidatePath()` in webhook handlers
- Test with hard refresh (bypasses router cache) AND normal navigation
- Dev and prod behave differently - test both

### Next.js 16 Request Proxy

`proxy.ts` at the project root handles cross-cutting request concerns — currently rate limiting for `/api/*` routes via `@/utils/rate-limit`. Security headers stay in `next.config.ts`.

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

- **Entity facts live in one file.** `lib/seo/site.ts`. JSON-LD, on-page prose, and `/llms.txt` all read from it, so they cannot disagree. Answer engines cross-check.
- **Organization + WebSite JSON-LD render from the root layout**, never from the homepage. Answer-engine traffic lands on deep pages; an entity that only exists on `/` is invisible to it.
- **Never emit a JSON-LD key you cannot fill.** `"description": null` is worse than an absent key. Conditional-spread every optional field.
- **Entity prose must be in the initial HTML and actually visible.** A visually quiet section is fine; `sr-only` or `display: none` reads as cloaking and gets discounted. If a page is visual-first (canvas, galleries), it needs a plain-prose block or crawlers have nothing to cite.
- **`Suspense fallback={null}` ships HTML with zero links.** Any client subtree that bails out of prerendering — `useSearchParams`, `cookies()`, `headers()` — leaves its fallback in the static HTML. If that fallback is `null`, crawlers see an empty page and the linked routes lose their only internal link. Server-render a static mirror of the list as the fallback; hydration swaps in the interactive version.
- **Never redirect on user-agent without exempting bots.** Googlebot Smartphone, site auditors, and AI crawlers send mobile UAs. A mobile redirect turns every sitemap entry into a 3XX. Gate the redirect behind a bot check (`isbot`) if you add one.
- **`metadataBase` must be set** or OG/Twitter image paths stay relative and fail to resolve for scrapers. It is set in `app/(site)/layout.tsx`.
- **Normalize CMS-authored hrefs** before rendering. Editors paste bare domains and mixed-case protocols; unnormalized values produce broken or duplicate-target links that leak crawl budget.
- **`/llms.txt`** is generated from `lib/seo/site.ts` at `app/llms.txt/route.ts`. Markdown mirrors of content routes (`/page.md`, with a `Link: <…>; rel="alternate"` header) are the next step for content-heavy sites — not shipped here because they need a CMS to be worth it.
- **Ship a `/ai` machine view.** One plain-HTML route (`app/ai/page.tsx`) that names the entity and links every page, under its own layout with no chrome, no canvas and no client components of its own. Visual-first pages give answer engines nothing to cite; this gives them everything in one fetch. Keep it in sync with `app/sitemap.ts` — a route missing from either is invisible. It still inherits the app providers mounted by `app/(site)/layout.tsx`; to make it genuinely runtime-free, move it out of the `(site)` route group (the root `app/layout.tsx` is already a bare html/body shell).
- **Fetch CMS content with the published perspective for machine-readable routes.** Draft/preview perspectives embed stega encoding — invisible Unicode characters interleaved through every string for visual editing. They are invisible to humans and corrupt the text an LLM reads. Anything rendered into `/ai`, `/llms.txt`, or a `.md` mirror must come from a published-perspective fetch or be run through `stegaClean`.
- **Drive any human/machine view toggle from a server prop, not the pathname.** Reading `usePathname()` to decide which mode is active makes the first paint ambiguous and can flip after hydration. Pass `mode` down from the layout that already knows.

---

## Integrations

All integrations are optional and self-contained in `lib/integrations/{name}/`. See `lib/integrations/README.md`.

- Always use `fetchWithTimeout` for external API calls (default 10s)
- Never use `process.env` directly - use `import { env } from '@/lib/env'` for typed, validated access
- Never commit secrets; document required vars in `.env.example`
- Server actions return `{ status: number, message: string, fieldErrors?: Record<string, string> }`
- Client form validation reuses the same Zod schemas via `zodToValidator()` bridge
- This is a deliberate split, not drift: API route handlers return `{ data, error }` (the darkroom team convention for API responses), while server-action FORM results use the `{ status, message, fieldErrors }` shape above because they are UI state consumed by form hooks, not API responses. Don't unify the two shapes.

---

## Commands

```bash
bun dev              # Dev server (Turbopack)
bun run build        # Production build (runs setup:styles first)
bun run check        # oxlint + oxfmt --check + lint:types + tsc --noEmit + bun test + manifest:check (must pass before commit)
bun lint             # oxlint
bun lint:fix         # oxlint with auto-fix
bun run lint:types   # oxlint type-aware rules (no-floating-promises, no-misused-promises)
bun run format       # oxfmt (writes in place; sorts imports + Tailwind classes)
bun run typecheck    # tsc --noEmit (TypeScript 7 native)
bun run typecheck:watch  # tsc --noEmit --watch (native fast watcher; live feedback)
bun test             # Unit tests (bun's built-in runner; ignores *.e2e.ts)
bun run test:e2e     # Playwright E2E smoke test (boots dev server automatically)
bun run setup:project  # Strip unused integrations (non-interactive: --preset/--keep, --yes, --clean-homepage, --skip-install, --dry-run)
bun run doctor       # Diagnose setup issues
```

Pre-commit hook (lefthook) runs on staged files: oxfmt + oxlint --fix (sequential, one command), in parallel with tsc typecheck. Type-aware linting is excluded from the hook to keep commits fast.

---

## Documentation Map

| Document                       | Purpose                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `ARCHITECTURE.md`              | Architectural decisions, patterns, and customization boundaries |
| `COMPONENTS.md`                | Auto-generated component / hook / utility inventory             |
| `CHANGELOG.md`                 | Release history and versioning policy                           |
| `SECURITY.md`                  | Security policy and vulnerability reporting                     |
| `app/README.md`                | App Router structure, page patterns, Wrapper props              |
| `components/README.md`         | Component inventory and conventions                             |
| `components/layout/README.md`  | Header, footer, and page wrapper architecture                   |
| `components/effects/README.md` | Animation component docs                                        |
| `lib/README.md`                | Library structure overview                                      |
| `lib/seo/`                     | Entity facts (`site.ts`), JSON-LD builders, `/llms.txt` source  |
| `lib/integrations/README.md`   | Per-integration docs (Sanity, Shopify, HubSpot)                 |
| `lib/styles/README.md`         | Design system and style generation                              |
| `lib/webgl/README.md`          | WebGL/R3F architecture, tunnel system, device gating            |
| `lib/hooks/README.md`          | Custom hook inventory                                           |
| `lib/dev/README.md`            | Debug tools suite (Orchestra)                                   |
| `lib/features/README.md`       | Optional feature loading for the root layout                    |

---

## Versioning

Satus follows [Semantic Versioning](https://semver.org), read from the perspective of a project that forked it: **MAJOR** = changes that break a fork on update (removing or renaming a core primitive, restructuring directories or path aliases, dropping an integration, a Node.js / Next.js major); **MINOR** = additive (new components, hooks, utilities, integrations); **PATCH** = fixes, dependency bumps, docs, internal refactors. `package.json` tracks the latest release tag, and forks track upstream by rebasing onto it (no long-term support branches). Full policy and release history: [`CHANGELOG.md`](./CHANGELOG.md).

---

_Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)_
