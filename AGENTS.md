# AGENTS.md - Satus Engineering Standards

This is the **single source of truth** for engineering standards in this repo. Claude Code, Cursor, and all other AI tools read this file. The other docs (`CLAUDE.md`, `.cursor/rules/`) are thin pointers back here.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Cache Components, `proxy.ts`) |
| UI | React 19.2 (React Compiler ON, no manual memoization) |
| Language | TypeScript 5, `strict: true` |
| Styling | Tailwind v4 (CSS-first) + CSS Modules |
| Runtime | Bun |
| Linter / Formatter | Biome |
| Validation | Zod |
| Animation | Lenis, GSAP, Tempus |
| 3D (optional) | React Three Fiber, `@react-three/drei` |

---

## Enforced Rules (CI fails without these)

These are non-negotiable. Each is enforced by Biome or TypeScript; the build or pre-commit hook will fail on violation.

### Biome lint rules

| Rule | What it catches | Enforcer |
|------|----------------|---------|
| `noExplicitAny` | `any` types | Biome `suspicious` |
| `useImportType` | Missing `import type` for type-only imports | Biome `style` (`.ts`/`.tsx`) |
| `useExportType` | Missing `export type` for type-only re-exports | Biome `style` (`.ts`/`.tsx`) |
| `useSortedClasses` | Unsorted Tailwind classes in `className`, `class`, `cn()`, `clsx()` | Biome `nursery` |
| `noImgElement` | Raw `<img>` tags (use `@/components/ui/image`) | Biome `performance` |
| `no-anchor-element` | Raw `<a>` tags (use `@/components/ui/link`) | Biome plugin |
| `no-relative-parent-imports` | `../` parent imports (use `@/` aliases) | Biome plugin |
| `no-unnecessary-forwardref` | `forwardRef` wrappers (React 19 ref-as-prop) | Biome plugin |
| `noUnusedImports` | Unused imports | Biome `correctness` |
| `noUnusedVariables` | Unused variables | Biome `correctness` |
| `useJsxKeyInIterable` | Missing `key` in list renders | Biome `correctness` (`.tsx`/`.jsx`) |
| `useAltText` | Missing `alt` on images | Biome `a11y` |
| `useButtonType` | `<button>` missing `type` attribute | Biome `a11y` |
| `noDangerouslySetInnerHtmlWithChildren` | XSS risk | Biome `security` |
| `useImportsFirst` | Imports not at top of file | Biome `nursery` |

### TypeScript strict flags (all active in `tsconfig.json`)

`strict`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`

### Path aliases (required, enforced by `no-relative-parent-imports`)

```tsx
import { Image } from '@/components/ui/image'   // NOT next/image
import { Link } from '@/components/ui/link'     // NOT next/link
import { useRect } from '@/hooks/use-rect'
import { clamp } from '@/utils/math'
```

Available aliases: `@/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/styles/*`, `@/integrations/*`, `@/webgl/*`, `@/utils/*`, `@/config`, `@/dev/*`.

---

## House Style (Darkroom conventions)

These are the subjective choices baked into this starter. A team forking satus can change any of these without breaking the build.

### Component file shape

```tsx
import s from './my-component.module.css'    // CSS Modules imported as 's'
import cn from 'clsx'
import type { ComponentProps } from 'react'

interface MyComponentProps extends ComponentProps<'div'> {
  variant?: 'primary' | 'secondary'
}

export function MyComponent({ variant = 'primary', className, ...props }: MyComponentProps) {
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
  return <Collapsible.Root className={cn(s.accordion, className)} {...props}>{children}</Collapsible.Root>
}

export { Body, Button, Group, Root }
export const Accordion = { Group, Root, Button, Body }
```

**Pattern B - Function properties** (Tooltip, Checkbox, Switch):

```tsx
function Tooltip({ content, children, side = 'top', className }: TooltipProps) { /* simple API */ }
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
interface MyState { count: number }
interface MyActions { increment: () => void }
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
    <MyContext.Provider value={{
      state: { count },
      actions: { increment: () => setCount((c) => c + 1) },
    }}>
      {children}
    </MyContext.Provider>
  )
}
```

For component-scoped contexts, inline `createContext` + `useContext` is fine.

### 4. Server vs Client Split

```tsx
// product-page.tsx - Server Component (no directive)
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await fetchProduct(params.slug)
  return <ProductView product={data} />   // serializable props only
}

// product-view.tsx - Client Component
'use client'
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

Validate external API *responses* at the boundary, not just env config. Pass
untrusted upstream JSON (GraphQL envelopes, REST payloads) through
`parseApiResponse(schema, data, context)` (`@/utils/validation`) so a malformed
response fails clearly at the edge with context instead of crashing downstream.
The Shopify, HubSpot, and Mailchimp clients all do this.

### 6. WebGL Element Lifecycle

DOM-synced WebGL via tunnel system. `GlobalCanvas` persists across routes.

```
Root Layout -> GlobalCanvas (WebGLTunnel.Out, DOMTunnel.Out)
Page -> Canvas (activates global canvas) -> WebGLTunnel.In (portals 3D content up)
```

```tsx
// DOM side
'use client'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'
import { useCanvas } from '@/webgl/components/canvas'

function MyWebGLComponent({ className }: { className?: string }) {
  const { setRef, rect, isVisible } = useWebGLElement()
  const { WebGLTunnel } = useCanvas()
  return (
    <>
      <div ref={setRef} className={className} />
      <WebGLTunnel.In>
        <MyMesh rect={rect} visible={isVisible} />
      </WebGLTunnel.In>
    </>
  )
}
```

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

<Activity mode={isActive ? 'visible' : 'hidden'}>
  <ExpensiveComponent />
</Activity>
```

Good for: tabs, carousels, accordions, off-screen WebGL scenes. The component pre-renders without performance impact and automatically cleans up effects when hidden.

**`useEffectEvent`** - Separate event logic from effect dependencies.

```tsx
import { useEffect, useEffectEvent } from 'react'

function Component({ url, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme)  // theme changes won't trigger reconnect
  })

  useEffect(() => {
    const connection = createConnection(url)
    connection.on('connected', onConnected)
    connection.connect()
    return () => connection.disconnect()
  }, [url])  // Only reconnects when url changes
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
function Button({ ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return <button ref={ref} {...props} />
}
```

### Next.js 16 Cache Components

Cache Components are enabled globally (`cacheComponents: true` in `next.config.ts`).

| Data type | Cache strategy |
|-----------|---------------|
| Public content | ISR with `revalidate`, inside a `'use cache'` function |
| User-specific (carts, accounts) | `cache: 'no-store'` - never cache |
| Real-time (live feeds, prices) | `cache: 'no-store'` |

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
@import "tailwindcss";

@theme {
  --font-display: "Satoshi", "sans-serif";
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

---

## Integrations

All integrations are optional and self-contained in `lib/integrations/{name}/`. See `lib/integrations/README.md`.

- Always use `fetchWithTimeout` for external API calls (default 10s)
- Never use `process.env` directly - use `import { env } from '@/lib/env'` for typed, validated access
- Never commit secrets; document required vars in `.env.example`
- Server actions return `{ status: number, message: string, fieldErrors?: Record<string, string[]> }`
- Client form validation reuses the same Zod schemas via `zodToValidator()` bridge

---

## Commands

```bash
bun dev              # Dev server (Turbopack)
bun run build        # Production build (runs setup:styles first)
bun run check        # Biome + tsgo --noEmit + bun test (must pass before commit)
bun lint             # Biome lint
bun lint:fix         # Biome lint with auto-fix
bun run format       # Biome format
bun run typecheck    # tsgo --noEmit
bun test             # Unit tests
bun run doctor       # Diagnose setup issues
```

Pre-commit hook (lefthook) runs in parallel on staged files: Biome check + tsgo typecheck.

---

## Documentation Map

| Document | Purpose |
|----------|---------|
| `ARCHITECTURE.md` | Architectural decisions, patterns, and customization boundaries |
| `COMPONENTS.md` | Auto-generated component / hook / utility inventory |
| `CHANGELOG.md` | Release history and versioning policy |
| `SECURITY.md` | Security policy and vulnerability reporting |
| `components/README.md` | Component inventory and conventions |
| `lib/README.md` | Library structure overview |
| `lib/integrations/README.md` | Per-integration docs (Sanity, Shopify, HubSpot) |
| `lib/styles/README.md` | Design system and style generation |
| `components/effects/README.md` | Animation component docs |

---

## Versioning

Satus follows [Semantic Versioning](https://semver.org), read from the perspective of a project that forked it: **MAJOR** = changes that break a fork on update (removing or renaming a core primitive, restructuring directories or path aliases, dropping an integration, a Node.js / Next.js major); **MINOR** = additive (new components, hooks, utilities, integrations); **PATCH** = fixes, dependency bumps, docs, internal refactors. `package.json` tracks the latest release tag, and forks track upstream by rebasing onto it (no long-term support branches). Full policy and release history: [`CHANGELOG.md`](./CHANGELOG.md).

---

*Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)*
