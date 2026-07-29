# Architecture Guide

Key architectural decisions and patterns for teams working with this codebase.

## Core Decisions

### React Compiler (No Manual Memoization)

React Compiler is enabled — no `useMemo`, `useCallback`, or `React.memo`. See AGENTS.md § No manual memoization.

### CSS Modules + Tailwind

Tailwind for layout/spacing/color; CSS Modules for complex animations and custom layouts. See AGENTS.md § Styling split.

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
;<OptionalFeatures /> // Only loads WebGL, dev tools when needed
```

### Linting and Formatting (oxc)

`oxlint` lints, `oxfmt` formats. One toolchain, one editor extension (`oxc.oxc-vscode`), one pre-commit hook.

```bash
bun lint             # oxlint
bun lint:fix         # oxlint, auto-fix
bun lint:types       # type-aware rules (not in the pre-commit hook)
bun run format       # oxfmt, writes in place
bun run check        # oxlint + oxfmt --check + lint:types + tsc + tests + manifest
```

**Why?**

- **Sorting is a formatting concern, not a lint error.** `oxfmt` sorts imports and Tailwind classes on format or save, so they fix themselves instead of failing `bun lint`.
- **One formatter for the whole repo.** Markdown, YAML, and TOML are formatted alongside TS/TSX/CSS, so docs and workflows stop drifting from house style.
- **Type-aware linting.** `bun lint:types` reads the TypeScript program to catch un-awaited promises and async handlers passed where a void return is expected — bugs a syntax-only linter cannot see. It runs in `bun run check` and CI but stays out of the pre-commit hook, so commits stay fast.

#### Compared to Biome

Biome is the obvious alternative and covers most of the same ground. What differs:

|                               | Biome                                    | oxc                                                                                                   |
| ----------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Import + Tailwind class order | Lint errors you fix, or an assist action | Sorted by the formatter on save                                                                       |
| Type-aware rules              | None                                     | `no-floating-promises`, `no-misused-promises` (found 18 real floating promises here on the first run) |
| Markdown / YAML / TOML        | Not formatted                            | Formatted                                                                                             |
| CSS                           | Linted **and** formatted                 | Formatted only, no linter                                                                             |
| Custom rules                  | GritQL plugin files                      | Built-in rules, no plugin files needed                                                                |

The first three are why this repo uses oxc. The CSS row is the cost, and it is real: rules like `noUnknownProperty` and `noDescendingSpecificity` have no oxlint counterpart. If a project leans hard on CSS linting, add Stylelint or stay on Biome.

**Trade-off:** oxlint has no CSS parser, so there is no CSS _linting_. `oxfmt` still formats stylesheets, CSS Modules and Tailwind v4 at-rules included, except the generated `lib/styles/css/tailwind.css` and `root.css`, which are deliberately left to their generator.

Config lives in `oxlint.config.ts` and `oxfmt.config.ts` rather than JSON, so `bun run typecheck` covers it and each choice carries a comment. That catches invalid severities and duplicate rule keys, which a JSON config accepts silently; rule _names_ are still a permissive `Record`, so a typo'd rule name slips through either way. House style is pinned explicitly (80 columns, 2-space indent, single quotes, semicolons only where required) because oxfmt's own defaults differ. See AGENTS.md § Enforced Rules for the rule-by-rule list.

## Cache Components (Next.js 16)

Server Components use advanced caching. Key rules:

| Data Type      | Cache Strategy        |
| -------------- | --------------------- |
| Public content | ISR with `revalidate` |
| User-specific  | `cache: 'no-store'`   |
| Real-time      | `cache: 'no-store'`   |

**Gotchas:**

- Never cache user data (carts, accounts, private content)
- Wrap cached components in Suspense boundaries
- Test with hard refresh AND navigation (different cache layers)
- Use `revalidateTag()` or `revalidatePath()` for invalidation

## WebGL Architecture

A single root canvas (`<Canvas root>`) hosts the scene; content is portalled in
with `<WebGLTunnel>`. Two mutually-exclusive strategies — pick one:

```
Shared (default):  Root Layout → <Canvas root> (lazy via lib/features)
Per page:          <Wrapper webgl> → <Canvas root>

    └─ WebGLTunnel (portals 3D content)
        └─ Your 3D scene
```

The shared strategy keeps the context alive across navigation; the per-page
strategy remounts it per route. Rendered only on WebGL-capable devices. See
[lib/webgl/README.md](lib/webgl/README.md).

## Animation

Use `useReveal` (CSS-driven, compositor thread) for reveal-on-scroll and entrance animations. Reserve GSAP for orchestration, scrubbing, and pinning. Always honor `prefers-reduced-motion` — `useReveal` short-circuits automatically; CSS global neutralizer is in `global.css`. See AGENTS.md § Animation.

## File Organization

```
components/
├── ui/        → Primitives (reusable)
├── layout/    → Site chrome (customize)
└── effects/   → Animations

lib/
├── hooks/     → React hooks
├── styles/    → CSS & Tailwind config
├── utils/     → Pure utilities
├── integrations/ → Third-party (optional)
├── webgl/     → 3D graphics (optional)
└── dev/       → Debug tools (optional)
```

### Validation Layer

Zod schemas provide type-safe validation at three boundaries:

1. **Environment variables** -- Per-integration schemas validate config via the registry (`isConfigured()`) and `doctor.ts`
2. **Server actions** -- `parseFormData()` validates FormData before processing (HubSpot, Mailchimp, Shopify)
3. **Client forms** -- `zodToValidator()` bridges the same Zod schemas to the form hook's client-side validation

All schemas live in `lib/utils/validation.ts`. The typed env singleton (`lib/env.ts`) provides IntelliSense for `process.env` access.

### Request Proxy

`proxy.ts` handles cross-cutting concerns (rate limiting for `/api/*`). See AGENTS.md for usage guidance.

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Build passes (`bun run build`)
- [ ] Webhooks configured (Sanity, Shopify)
- [ ] Cache invalidation tested
- [ ] Performance score > 90
- [ ] **Not deploying to Vercel?** If you keep Sanity and prune dev dependencies on the server, `/studio` will fail at request time. See [lib/integrations/sanity/README.md](lib/integrations/sanity/README.md) § Deploying outside Vercel.

## Customization Boundaries

One decision drives how you work in this repo: **are you building your project, or extending the starter?**

- **Building your project** (pages, content, styling): modify freely. `app/` is yours.
- **Extending the starter** (new shared primitives): add alongside the existing ones rather than rewriting them.

This keeps upstream updates smooth. When you create new components instead of modifying starter ones, and keep your pages and content separate from starter utilities, pulling satus updates stays low-conflict. There are no strict folder rules beyond that: `components/` for UI, `lib/` for everything else.

## Extending

**New component**: `bun run generate` or add to `components/ui/`

**New integration**: Add Zod env schema in `@/utils/validation`, add entry in `lib/integrations/registry.ts`. Everything else (`doctor`, listing helpers) derives automatically from the registry.

**Modify styles**: Edit config in `lib/styles/`, run `bun setup:styles`

---

_Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)_
