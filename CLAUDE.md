# Satus -- AI Agent Guide

React Router starter by [darkroom.engineering](https://darkroom.engineering).

**Stack**: React Router 7 (SSR), React 19, TypeScript (strict), Tailwind v4 + CSS Modules + Lightning CSS, Vite 8, Bun, Oxlint/Oxfmt.

## File Structure

```
app/
  root.tsx              # HTML shell, ThemeProvider, header, footer, global canvas, dev tools
  routes.ts             # Route config
  routes/               # Route modules (loaders, components, meta)
  components/           # Route-specific components (header, footer)
components/             # Reusable: image, link, wrapper, theme, lenis, marquee, fold,
                        # scrollbar, real-viewport, scroll-restoration, gsap, split-text, progress-text
hooks/                  # Custom hooks + Zustand store
utils/                  # Pure utilities (math, easings, animation, raf, fetch, strings, viewport)
styles/                 # Design system config, generated CSS, Vite plugin, Lightning CSS functions
integrations/sanity/    # Sanity client, queries, image utils, session, loader
dev/                    # Debug tools (Orchestra, grid, stats, minimap, Theatre.js)
webgl/                  # 3D graphics system (R3F, global canvas, tunnels)
env.ts                  # Client env (t3-env + valibot, PUBLIC_ prefix)
env.server.ts           # Server env (t3-env + valibot)
vite.config.ts          # Vite config, Tailwind, Lightning CSS, darkroom-styling plugin
```

## Critical Rules

### Path Alias

`~/` maps to project root. Only alias.

```tsx
import { Image } from "~/components/image";
import { clamp } from "~/utils/math";
import { breakpoints } from "~/styles/layout";
```

### Components

Use `~/components/image` (not raw `<img>`) and `~/components/link` (not raw `<a>` or RR `<Link>`).

### Wrapper

Every route wraps content with `<Wrapper>`. Opt into WebGL and Lenis per-page:

```tsx
<Wrapper>content</Wrapper>
<Wrapper webgl>content with 3D</Wrapper>
<Wrapper lenis={false}>no smooth scroll</Wrapper>
```

### CSS Modules

Import as `s`:

```tsx
import s from "./component.module.css";
```

### Environment Variables

`PUBLIC_` prefix for client (`import.meta.env`), plain for server (`process.env`). Validated with t3-env + valibot.

```tsx
import { env } from "~/env"; // client
import { env } from "~/env.server"; // server (.server.ts or loaders)
```

### Data Loading

React Router loaders for server data:

```tsx
export async function loader({ params }: Route.LoaderArgs) {
  const data = await client.fetch(query, { slug: params.slug });
  return { data };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { data } = loaderData;
}
```

### Lazy Loading

Components loaded with `React.lazy` must use `export default`:

```tsx
const MyComponent = lazy(() => import("./my-component"));
```

### No Manual Memoization

React Compiler handles optimization. Never use `useMemo`, `useCallback`, or `React.memo`.

### `import type` for Type-Only Imports

`verbatimModuleSyntax: true` in tsconfig.

## Component Pattern

```tsx
import s from "./my-component.module.css";
import cn from "clsx";
import type { ComponentProps } from "react";

interface MyComponentProps extends ComponentProps<"div"> {
  variant?: "primary" | "secondary";
}

export function MyComponent({ variant = "primary", className, ...props }: MyComponentProps) {
  return <div className={cn(s.root, className)} {...props} />;
}
```

- Named function declarations, not arrow functions
- Kebab-case filenames
- Zustand for global state, React state for component state

## Root Layout Pattern

- `ThemeProvider` — wraps everything, provides theme context
- `RealViewport` — standalone, sets CSS vars, returns null
- `ReactTempus` — standalone, manages RAF
- `GlobalCanvas` — standalone, persistent WebGL canvas (lazy)
- `OrchestraTools` — standalone, dev tools overlay (lazy, dev only)

Providers wrap. Standalone components return null and set global state.

## Styling

- **Tailwind v4** with `@tailwindcss/vite` plugin
- **Lightning CSS** as transformer with custom functions (`mobile-vw()`, `desktop-vw()`, `columns()`)
- **CSS generation** via `darkroom-styling` Vite plugin (auto-generates on config change)
- Design tokens in `styles/colors.ts`, `styles/layout.ts`, `styles/easings.ts`, `styles/typography.ts`
- Custom `dr-*` utility classes for responsive scaling
- Desktop breakpoint: 800px

## Key Libraries

| Package   | Purpose                       |
| --------- | ----------------------------- |
| `lenis`   | Smooth scroll                 |
| `gsap`    | Complex animations            |
| `tempus`  | RAF management                |
| `hamo`    | Performance hooks (`useRect`) |
| `zustand` | Global state                  |
| `clsx`    | Class name composition        |
| `valibot` | Schema validation (env vars)  |

## Commands

```bash
bun dev              # Dev server
bun run build        # Production build
bun run check        # Lint + format + typecheck
bun run lint         # Oxlint
bun run format       # Oxfmt
bun run typecheck    # TypeScript check
```

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- No force push to `main`

## Review Checklist for Agents

- [ ] Run `bun install` after pulling remote changes and before getting started.
- [ ] Run `bun run check` to validate changes.
