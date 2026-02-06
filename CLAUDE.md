# Satus -- AI Agent Guide

Next.js 16 starter template by [darkroom.engineering](https://darkroom.engineering).

**Stack**: Next.js 16, React 19, TypeScript (strict), Tailwind v4 + CSS Modules, Bun, Biome, React Compiler ON.

## Documentation Map

| Document | Purpose |
|----------|---------|
| `ARCHITECTURE.md` | Architectural decisions and patterns |
| `BOUNDARIES.md` | What to customize vs what is framework |
| `components/README.md` | Component inventory and conventions |
| `lib/README.md` | Library structure overview |
| `lib/integrations/*/README.md` | Per-integration docs (Sanity, Shopify, HubSpot) |
| `lib/styles/README.md` | Design system and style generation |
| `components/effects/README.md` | Animation component docs |

## Critical Rules

These break the build or cause bugs if violated.

### 1. Use Wrapper Components (never raw Next.js)

```tsx
import { Image } from '@/components/ui/image' // NOT next/image
import { Link } from '@/components/ui/link'    // NOT next/link
```

Biome plugin `no-anchor-element` enforces no raw `<a>` tags. Biome rule `noImgElement: error` enforces no raw `<img>` tags.

### 2. CSS Modules Imported as `s`

```tsx
import s from './component.module.css'
```

### 3. Path Aliases Required

```tsx
import { Image } from '@/components/ui/image'
import { useRect } from '@/hooks/use-rect'
import { clamp } from '@/utils/math'
```

Available aliases: `@/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/styles/*`, `@/integrations/*`, `@/webgl/*`, `@/utils/*`, `@/config`, `@/dev/*`.

Biome plugin `no-relative-parent-imports` enforces this -- no `../` imports.

### 4. Server Components by Default

Only add `'use client'` when you need hooks, event handlers, or browser APIs. Keep data fetching in Server Components and pass props down.

### 5. No Manual Memoization

React Compiler handles all optimization. **Never** use `useMemo`, `useCallback`, or `React.memo`.

**Exception**: Use `useRef` for class/object instantiation to prevent infinite loops:

```tsx
const instanceRef = useRef<SomeClass | null>(null)
if (!instanceRef.current) {
  instanceRef.current = new SomeClass(params)
}
```

### 6. No `any` Types

`noExplicitAny: error` in Biome. Use `unknown` + type narrowing instead.

### 7. Sorted Tailwind Classes

`useSortedClasses: error` in Biome. Classes in `className`, `class`, `cn()`, and `clsx()` must be sorted.

### 8. `import type` for Type-Only Imports

`verbatimModuleSyntax: true` in tsconfig. `useImportType: error` and `useExportType: error` in Biome.

```tsx
import type { ComponentProps } from 'react'
```

### 9. WebGL Cleanup Mandatory

Dispose materials, textures, geometries, and render targets on unmount. Remove event listeners. Gate debug UI with `process.env.NODE_ENV === 'development'`.

### 10. Integration Optionality

All integrations (Sanity, Shopify, HubSpot) must gracefully handle missing env vars. Use `fetchWithTimeout` for external API calls.

## File Structure

```
app/                  # Routes only -- no components here
components/
  ui/                 # Reusable primitives (Image, Link, Form, etc.)
  layout/             # Page chrome (Wrapper, Header, Footer, Theme, Lenis)
  effects/            # Animation components (GSAP, SplitText, etc.)
lib/
  hooks/              # Custom hooks + Zustand stores
  utils/              # Pure utilities (math, fetch, metadata, strings, animation)
  styles/             # Design system, Tailwind config (CSS-based for v4)
  integrations/       # Third-party services (Sanity, Shopify, HubSpot)
  webgl/              # 3D graphics (optional, lazy-loaded)
  dev/                # Debug tools (stripped in production)
  features/           # Root layout conditional features
  scripts/            # CLI tools (dev, setup)
```

## TypeScript

- `strict: true` plus: `noImplicitOverride`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noUncheckedSideEffectImports`
- Target: ES2023, module: ESNext, moduleResolution: bundler
- `verbatimModuleSyntax: true` -- use `import type` for type-only imports
- Prefer `interface` for object shapes, `type` for unions/intersections
- Props extend `ComponentProps<'element'>` when wrapping HTML elements
- React 19: `ref` is a regular prop, no `forwardRef` needed

## Styling

- **Tailwind v4**: CSS-based config (no `tailwind.config.js`), uses `@theme` directive
- **CSS Modules**: For complex animations, custom layouts, CSS specificity
- Combine with `cn()` from `clsx`
- Design tokens in `lib/styles/css/root.css`
- Custom viewport functions: `mobile-vw()`, `mobile-vh()`, `desktop-vw()`, `desktop-vh()`
- Column function: `columns(n)` for grid-based sizing
- Custom `dr-*` utility classes for responsive scaling (see `lib/styles/README.md`)
- Use `h-dvh` not `h-screen`
- Animate only `transform`, `opacity` (compositor properties)
- Desktop breakpoint: 800px

## Component Conventions

```tsx
// Standard component pattern
import s from './my-component.module.css'
import cn from 'clsx'
import type { ComponentProps } from 'react'

interface MyComponentProps extends ComponentProps<'div'> {
  variant?: 'primary' | 'secondary'
}

export function MyComponent({ variant = 'primary', className, ...props }: MyComponentProps) {
  return <div className={cn(s.root, className)} {...props} />
}
```

- Named function declarations, not arrow functions
- Kebab-case filenames (`my-component.tsx`, `my-component.module.css`)
- CamelCase CSS class names (`.isPrimary`, `.isDisabled`)
- Zustand for global state, React state for component state
- `next/dynamic` for heavy components with `{ ssr: false }` when needed

## Key Libraries

| Package | Purpose |
|---------|---------|
| `lenis` | Smooth scroll (configured in layout) |
| `gsap` | Complex animations |
| `tempus` | RAF management |
| `hamo` | Performance hooks (`useRect`, etc.) |
| `@base-ui/react` | Unstyled UI primitives |
| `zustand` | Global state management |
| `clsx` | Class name composition (aliased as `cn`) |

## Commands

```bash
bun dev              # Dev server with Turbopack
bun run build        # Production build (runs setup:styles first)
bun run check        # biome check + tsgo --noEmit + bun test
bun lint             # Biome lint
bun lint:fix         # Biome lint with auto-fix
bun run format       # Biome format
bun run typecheck    # tsgo --noEmit
bun test             # Unit tests
```

## Pre-Commit Hooks (lefthook)

Runs in parallel on staged files:
1. **Biome**: `biome check --write --unsafe` on `*.{js,mjs,ts,jsx,tsx,css,scss}`
2. **Typecheck**: `tsgo --noEmit` on `*.{ts,tsx}`

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- No force push to `main`
- No `--no-verify` unless explicitly requested
- Small, atomic commits

## Before Committing

```bash
bun run check   # Must pass: biome + types + tests
```

## Customization Philosophy

From `BOUNDARIES.md`: modify pages and content freely, extend starter components by creating new ones alongside existing ones. Do not modify core `ui/` primitives unless necessary -- create wrappers instead.
