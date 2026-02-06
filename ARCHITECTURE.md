# Architecture Guide

Key architectural decisions and patterns for teams working with this codebase.

## Core Decisions

### React Compiler (No Manual Memoization)

React Compiler is enabled. **Do not** use `useMemo`, `useCallback`, or `React.memo`:

```tsx
// ❌ Don't
const memoizedValue = useMemo(() => compute(a, b), [a, b])

// ✅ Do
const value = compute(a, b)
```

**Exception**: Use `useRef` for object instantiation to prevent infinite loops.

### CSS Modules + Tailwind

Both are used intentionally:
- **Tailwind** (80%) — spacing, colors, typography
- **CSS Modules** — complex animations, custom layouts, CSS specificity

Import CSS modules as `s`:

```tsx
import s from './component.module.css'
```

### Custom Image/Link Components

Always use these, never native HTML:

```tsx
import { Image } from '@/components/ui/image'
import { Link } from '@/components/ui/link'
```

**Why?**
- Image: Optimization, aspect ratios, WebGL integration
- Link: External detection, prefetching, consistent behavior

### Lenis for Scrolling

Configured in `app/layout.tsx`. ScrollTrigger uses Lenis automatically.

### Optional Features Pattern

Root layout conditionally loads features:

```tsx
import { OptionalFeatures } from '@/lib/features'
<OptionalFeatures /> // Only loads WebGL, dev tools when needed
```

## Cache Components (Next.js 16)

Server Components use advanced caching. Key rules:

| Data Type | Cache Strategy |
|-----------|----------------|
| Public content | ISR with `revalidate` |
| User-specific | `cache: 'no-store'` |
| Real-time | `cache: 'no-store'` |

**Gotchas:**
- Never cache user data (carts, accounts, private content)
- Wrap cached components in Suspense boundaries
- Test with hard refresh AND navigation (different cache layers)
- Use `revalidateTag()` or `revalidatePath()` for invalidation

## WebGL Architecture

Uses lazy GlobalCanvas with visibility-based pausing:

```
Root Layout → LazyGlobalCanvas (mounts on first WebGL page)
    └─ WebGLTunnel (portals 3D content)
        └─ Your 3D scene
```

Context survives navigation. See [lib/webgl/README.md](lib/webgl/README.md).

## File Organization

```
components/
├── ui/        → Primitives (reusable)
├── layout/    → Site chrome (customize)
└── effects/   → Animations

lib/
├── hooks/     → React hooks + Zustand
├── styles/    → CSS & Tailwind config
├── utils/     → Pure utilities
├── integrations/ → Third-party (optional)
├── webgl/     → 3D graphics (optional)
└── dev/       → Debug tools (optional)
```

### Validation Layer

Zod schemas provide type-safe validation at three boundaries:

1. **Environment variables** -- Per-integration schemas validate config at startup via `check-integration.ts` and `doctor.ts`
2. **Server actions** -- `parseFormData()` validates FormData before processing (HubSpot, Mailchimp, Shopify)
3. **Client forms** -- `zodToValidator()` bridges the same Zod schemas to the form hook's client-side validation

All schemas live in `lib/utils/validation.ts`. The typed env singleton (`lib/env.ts`) provides IntelliSense for `process.env` access.

### Request Proxy

`proxy.ts` (project root) handles cross-cutting request concerns for Next.js 16. Currently configured with rate limiting for `/api/*` routes. Security headers remain in `next.config.ts` (they're static configuration).

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Build passes (`bun build`)
- [ ] Webhooks configured (Sanity, Shopify)
- [ ] Cache invalidation tested
- [ ] Performance score > 90

## Extending

**New component**: `bun run generate` or add to `components/ui/`

**New integration**: Add Zod env schema in `@/utils/validation`, add entry in `lib/integrations/registry.ts`. Everything else (`check-integration`, `doctor`) derives automatically from the registry.

**Modify styles**: Edit config in `lib/styles/`, run `bun setup:styles`

---

*Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)*
