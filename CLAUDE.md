# Satus -- AI Agent Guide

Next.js 16 starter template by [darkroom.engineering](https://darkroom.engineering).

**Stack**: Next.js 16, React 19, TypeScript (strict), Tailwind v4 + CSS Modules, Bun, Biome, React Compiler ON.

## Documentation Map

| Document                       | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `ARCHITECTURE.md`              | Architectural decisions and patterns            |
| `BOUNDARIES.md`                | What to customize vs what is framework          |
| `components/README.md`         | Component inventory and conventions             |
| `lib/README.md`                | Library structure overview                      |
| `lib/integrations/*/README.md` | Per-integration docs (Sanity, Shopify, HubSpot) |
| `lib/styles/README.md`         | Design system and style generation              |
| `components/effects/README.md` | Animation component docs                        |

## Critical Rules

These break the build or cause bugs if violated.

### 1. Use Wrapper Components (never raw Next.js)

```tsx
import { Image } from "@/components/ui/image"; // NOT next/image
import { Link } from "@/components/ui/link"; // NOT next/link
```

Biome plugin `no-anchor-element` enforces no raw `<a>` tags. Biome rule `noImgElement: error` enforces no raw `<img>` tags.

### 2. CSS Modules Imported as `s`

```tsx
import s from "./component.module.css";
```

### 3. Path Aliases Required

```tsx
import { Image } from "@/components/ui/image";
import { useRect } from "@/hooks/use-rect";
import { clamp } from "@/utils/math";
```

Available aliases: `@/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/styles/*`, `@/integrations/*`, `@/webgl/*`, `@/utils/*`, `@/config`, `@/dev/*`.

Biome plugin `no-relative-parent-imports` enforces this -- no `../` imports.

### 4. Server Components by Default

Only add `'use client'` when you need hooks, event handlers, or browser APIs. Keep data fetching in Server Components and pass props down.

### 5. No Manual Memoization

React Compiler handles all optimization. **Never** use `useMemo`, `useCallback`, or `React.memo`.

**Exception**: Use `useRef` for class/object instantiation to prevent infinite loops:

```tsx
const instanceRef = useRef<SomeClass | null>(null);
if (!instanceRef.current) {
  instanceRef.current = new SomeClass(params);
}
```

### 6. No `any` Types

`noExplicitAny: error` in Biome. Use `unknown` + type narrowing instead.

### 7. Sorted Tailwind Classes

`useSortedClasses: error` in Biome. Classes in `className`, `class`, `cn()`, and `clsx()` must be sorted.

### 8. `import type` for Type-Only Imports

`verbatimModuleSyntax: true` in tsconfig. `useImportType: error` and `useExportType: error` in Biome.

```tsx
import type { ComponentProps } from "react";
```

### 9. WebGL Cleanup Mandatory

Dispose materials, textures, geometries, and render targets on unmount. Remove event listeners. Gate debug UI with `process.env.NODE_ENV === 'development'`.

### 10. Integration Optionality

All integrations (Sanity, Shopify, HubSpot) must gracefully handle missing env vars. Use `fetchWithTimeout` for external API calls.

## File Structure

```
proxy.ts              # Next.js 16 request proxy (rate limiting, auth)
app/                  # Routes only -- no components here
components/
  ui/                 # Reusable primitives (Image, Link, Form, etc.)
  layout/             # Page chrome (Wrapper, Header, Footer, Theme, Lenis)
  effects/            # Animation components (GSAP, SplitText, etc.)
lib/
  env.ts              # Typed environment variables (Zod-validated singleton)
  hooks/              # Custom hooks + Zustand stores
  utils/              # Pure utilities (math, fetch, metadata, strings, animation, validation)
  styles/             # Design system, Tailwind config (CSS-based for v4)
  integrations/       # Third-party services + registry (Sanity, Shopify, HubSpot)
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
- Kebab-case filenames (`my-component.tsx`, `my-component.module.css`)
- CamelCase CSS class names (`.isPrimary`, `.isDisabled`)
- Zustand for global state, React state for component state
- `next/dynamic` for heavy components with `{ ssr: false }` when needed

## Key Libraries

| Package          | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `lenis`          | Smooth scroll (configured in layout)                |
| `gsap`           | Complex animations                                  |
| `tempus`         | RAF management                                      |
| `hamo`           | Performance hooks (`useRect`, etc.)                 |
| `@base-ui/react` | Unstyled UI primitives                              |
| `zustand`        | Global state management                             |
| `clsx`           | Class name composition (aliased as `cn`)            |
| `zod`            | Schema validation (env vars, forms, server actions) |

## Validation

All server actions and form inputs use Zod schemas for validation. Env var checking uses Zod schemas via the integration registry.

```tsx
// Server action validation
import { emailSchema, parseFormData } from "@/utils/validation";

const schema = z.object({ email: emailSchema, name: z.string().min(1) });
const result = parseFormData(schema, formData);
if (!("success" in result)) return result; // Returns FormState on error

// Typed environment access
import { env } from "@/lib/env";
const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID;

// Integration registry (single source of truth)
import { isConfigured } from "@/integrations/registry";
if (isConfigured("sanity")) {
  /* ... */
}
```

Client-side form validation uses the same Zod schemas via `zodToValidator()` bridge.

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
bun run doctor       # Diagnose setup issues (env validation included)
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

<!--VITE PLUS START-->

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
<!--VITE PLUS END-->
