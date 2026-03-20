# Satus -- AI Agent Guide

React Router starter template by [darkroom.engineering](https://darkroom.engineering).

**Stack**: React Router 7 (framework mode, SSR), React 19, TypeScript (strict), Tailwind v4 + CSS Modules, Vite+, pnpm, Oxlint/Oxfmt, React Compiler ON.

## Critical Rules

### 1. Use Custom Components

```tsx
import { Image } from "@/components/image";
import { Link } from "@/components/link";
```

`Image` wraps native `<img>` with responsive sizes. `Link` wraps React Router `<Link>` with external detection and active state.

### 2. CSS Modules Imported as `s`

```tsx
import s from "./component.module.css";
```

### 3. Path Aliases

```tsx
import { Image } from "@/components/image";
import { useRect } from "@/hooks/use-rect";
import { clamp } from "@/utils/math";
```

Available: `@/*` (root), `@/hooks/*`, `@/styles/*`, `@/utils/*`, `~/*` (app dir). Resolved by Vite via `tsconfigPaths: true`.

### 4. No Manual Memoization

React Compiler handles optimization. Never use `useMemo`, `useCallback`, or `React.memo`.

### 5. `import type` for Type-Only Imports

`verbatimModuleSyntax: true` in tsconfig.

```tsx
import type { ComponentProps } from "react";
```

### 6. Environment Variables

Client-safe vars use `PUBLIC_` prefix and `import.meta.env`. Server-only vars use `process.env`. Both validated with t3-env + valibot.

```tsx
// Client (available everywhere)
import { env } from "@/env";
env.PUBLIC_SANITY_PROJECT_ID;

// Server only (.server.ts files or loaders)
import { env } from "@/env.server";
env.SANITY_API_READ_TOKEN;
```

### 7. Data Loading

Use React Router loaders for server data, `client.fetch()` for Sanity queries.

```tsx
export async function loader({ params }: Route.LoaderArgs) {
  const data = await client.fetch(query, { slug: params.slug });
  return { data };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { data } = loaderData;
}
```

## File Structure

```
app/
  root.tsx              # HTML shell, providers (RealViewport, Theme, Tempus)
  routes.ts             # Route config
  routes/               # Route modules (loaders, components, meta)
  components/           # Layout pieces colocated with routes (header, footer)
components/             # Flat reusable components (image, link, theme, lenis, marquee, fold, scrollbar, real-viewport)
features/
  animation/            # GSAP runtime, SplitText, ProgressText
  dev/                  # Orchestra debug tools (not yet ported)
  webgl/                # R3F system (not yet ported)
hooks/                  # Custom hooks + Zustand store
utils/                  # Pure utilities (math, easings, animation, raf, fetch, strings, viewport)
styles/                 # Design system, Tailwind config, CSS generation, PostCSS functions
integrations/
  sanity/               # Sanity client, queries, image utils, session, loader
env.ts                  # Client environment (t3-env + valibot, PUBLIC_ prefix)
env.server.ts           # Server environment (t3-env + valibot)
vite.config.ts          # Vite+ with React Router plugin, svgr, oxlint
react-router.config.ts  # SSR enabled
postcss.config.mjs      # Tailwind v4 + PostCSS functions + preset-env
```

## TypeScript

- `strict: true` plus `noImplicitOverride`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noUncheckedSideEffectImports`
- Target: ES2023, module: ESNext, moduleResolution: bundler
- `verbatimModuleSyntax: true`
- Prefer `interface` for object shapes, `type` for unions/intersections
- Props extend `ComponentProps<'element'>` when wrapping HTML elements
- React 19: `ref` is a regular prop, no `forwardRef` needed

## Styling

- **Tailwind v4**: CSS-based config, `@theme` directive
- **CSS Modules**: For complex animations, custom layouts
- Combine with `cn()` from `clsx`
- Design tokens in `styles/css/root.css`
- Custom PostCSS functions: `mobile-vw()`, `mobile-vh()`, `desktop-vw()`, `desktop-vh()`, `columns(n)`
- Custom `dr-*` utility classes for responsive scaling
- Desktop breakpoint: 800px
- Use `h-dvh` not `h-screen`

## Component Conventions

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
- CamelCase CSS class names (`.isPrimary`, `.isDisabled`)
- Zustand for global state, React state for component state
- `React.lazy` + `Suspense` for heavy components

## Key Libraries

| Package    | Purpose                          |
| ---------- | -------------------------------- |
| `lenis`    | Smooth scroll                    |
| `gsap`     | Complex animations               |
| `tempus`   | RAF management                   |
| `hamo`     | Performance hooks (`useRect`)    |
| `zustand`  | Global state                     |
| `clsx`     | Class name composition           |
| `valibot`  | Schema validation (env vars)     |
| `groq`     | Sanity query language            |

## Commands

```bash
vp dev               # Dev server (Vite)
vp build             # Production build
vp check             # Lint + format + typecheck
vp lint              # Oxlint
vp fmt               # Oxfmt
vp test              # Vitest
vp install           # Install dependencies (pnpm)
```

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- No force push to `main`
- Pre-commit: `vp check --fix` via `.vite-hooks/`

## Before Committing

```bash
vp check             # Must pass: lint + format + types
```

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
