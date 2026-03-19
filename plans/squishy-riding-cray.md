# Satus: Next.js → React Router Framework Mode Migration

## Context

Satus has grown from a starter template into a framework. The migration to React Router framework mode is the opportunity to simultaneously simplify — only porting what's core, flattening the structure, and leaving integrations/webgl/dev-tools for later extraction as recipes.

**Current**: Next.js 16, deeply nested `lib/`, 21+ UI components, full integrations baked in
**Target**: React Router framework mode (Vite), flat structure, ~13 core components, integrations preserved but isolated

## Decisions

- **Route directory**: `app/routes/` (React Router default convention)
- **Rendering**: SSR (server loaders/actions, needed for SEO + integrations)
- **Style generation**: Vite plugin (auto-generates CSS on config change)
- **Branch**: Continue on `novus`

## Target Structure

```
app/
  root.tsx                 ← html shell, providers
  entry.client.tsx         ← client hydration
  entry.server.tsx         ← server handler
  routes/
    home.tsx               ← index route
    _layout.tsx            ← root layout (optional, or use root.tsx)
    _layout/
      header.tsx
      footer.tsx
components/                ← flat, no subcategories
  image.tsx
  link.tsx
  marquee/
  fold/
  scrollbar/
  real-viewport.tsx
  scroll-restoration.tsx
  theme.tsx
  lenis.tsx
features/
  animation/
    gsap.tsx
    split-text.tsx
    progress-text/
    animated-gradient/
  webgl/                   ← minimal, ported later
hooks/                     ← top-level
utils/                     ← top-level
styles/                    ← design system + generated CSS
integrations/              ← self-contained, no registry
  sanity/
  shopify/
  hubspot/
  mailchimp/
env.ts                     ← top-level
vite.config.ts
react-router.config.ts
```

---

## Phases

### Phase 1: Bootstrap React Router + Vite (clean slate)
**Goal**: App boots on React Router framework mode with Vite. No ported code yet.

**Commit 1**: `feat: bootstrap react router framework mode with vite`
- Install: `react-router`, `@react-router/dev`, `@react-router/node`, `@react-router/serve`, `vite`, `@vitejs/plugin-react`
- Create `vite.config.ts` with React Router plugin + React compiler
- Create `react-router.config.ts` (file-based routing, SSR config)
- Create `app/root.tsx` (RR convention — html shell, minimal)
- Create `app/routes/home.tsx` (simple "hello world")
- Create `app/entry.client.tsx` + `app/entry.server.tsx` (RR conventions)
- Update `tsconfig.json` (remove Next.js plugin, update paths for new structure)
- Update `package.json` scripts (`dev`, `build`, `start`)
- Verify: `bun dev` serves the hello world page

Using `app/` as the RR convention directory with `app/routes/` for routes and `app/root.tsx` for the root.

---

### Phase 2: Styles system
**Goal**: Tailwind v4, CSS custom properties, PostCSS pipeline, and fonts working.

**Commit 2**: `feat: port styles system and design tokens`
- Move `lib/styles/` → `styles/` (colors, easings, layout, typography, config barrel)
- Move generated CSS (`root.css`, `tailwind.css`, `reset.css`, `global.css`, `index.css`)
- Port `postcss.config.mjs` (framework-agnostic, no changes)
- Replace `next/font/local` → `@font-face` in CSS (ServerMono woff2)
- Convert setup-styles to a Vite plugin (auto-generates on config change in dev, runs at build)
- Import `styles/css/index.css` in root.tsx
- Verify: page renders with correct fonts, colors, CSS custom properties

---

### Phase 3: Core utilities + hooks
**Goal**: All framework-agnostic code ported.

**Commit 3**: `feat: port utils and hooks`
- Move `lib/utils/` → `utils/` (math, easings, animation, raf, fetch, strings, viewport, context, validation)
- Move `lib/env.ts` → `env.ts`
- Move `lib/hooks/` → `hooks/` (store, use-device-detection, use-scroll-trigger, use-transform, use-sync-external)
- Rewrite `use-prefetch.ts`: replace `next/navigation` → React Router's prefetch
- Drop: `rate-limit.ts` (move to middleware later if needed), `metadata.ts` (Next.js specific)
- Update all import paths
- Verify: TypeScript compiles, no Next.js imports remain in these files

---

### Phase 4: Core components
**Goal**: All kept components ported and working.

**Commit 4**: `feat: port core components`
- **Rewrite `image.tsx`**: Remove `next/image`, use native `<img>` with responsive `srcSet`/`sizes`, keep shimmer blur, aspect ratio, preload logic
- **Rewrite `link.tsx`**: Replace `next/link` → React Router `<Link>`, replace `usePathname` → `useLocation`, keep external detection, prefetch, active state
- **Port as-is** (framework-agnostic): marquee, fold, scrollbar, real-viewport, scroll-restoration
- **Port `theme.tsx`**: Replace `usePathname` → `useLocation`
- **Port `lenis.tsx`**: Replace `next/dynamic` → `React.lazy` + Suspense
- All components flat in `components/` — folders only when CSS module or multiple files
- Verify: components render correctly on the home route

---

### Phase 5: Animation features
**Goal**: GSAP, SplitText, ProgressText, AnimatedGradient working.

**Commit 5**: `feat: port animation features`
- Move to `features/animation/`
- Port `gsap.tsx` (framework-agnostic, no changes)
- Port `split-text.tsx` (framework-agnostic)
- Port `progress-text/` (framework-agnostic)
- Port `animated-gradient/`: replace `next/dynamic` → `React.lazy` + Suspense
- Verify: animations work on a test route

---

### Phase 6: Route structure + layouts
**Goal**: Real page structure with header, footer, root layout.

**Commit 6**: `feat: set up route structure with root layout`
- Build root layout (`app/root.tsx`): RealViewport, TransformProvider, Theme, Lenis, OptionalFeatures equivalent
- Colocate header + footer with root layout
- Create home route with basic content
- Wire up Lenis smooth scroll
- Verify: full page renders with header, footer, smooth scroll, theme switching

---

### Phase 7: Integrations (preserve, isolate)
**Goal**: Integrations moved top-level, self-contained, no registry.

**Commit 7**: `refactor: move integrations top-level without registry`
- Move `lib/integrations/sanity/` → `integrations/sanity/`
- Move `lib/integrations/shopify/` → `integrations/shopify/`
- Move `lib/integrations/hubspot/` → `integrations/hubspot/`
- Move `lib/integrations/mailchimp/` → `integrations/mailchimp/`
- Each integration validates its own env vars (no central registry)
- Update imports across integration files
- Verify: TypeScript compiles, integrations self-validate

---

### Phase 8: Cleanup
**Goal**: Remove all Next.js remnants.

**Commit 8**: `chore: remove next.js and dead code`
- Remove `next`, `next-sanity`, `@next/bundle-analyzer`, `@svgr/webpack` from deps
- Delete old `app/` directory (Next.js routes), `next.config.ts`, `proxy.ts`
- Delete `lib/` directory entirely
- Delete `components/ui/`, `components/layout/`, `components/effects/` (old structure)
- Delete `lib/scripts/`, `lib/dev/`, `lib/features/`
- Update `biome.json` (remove Next.js domain, update ignores)
- Update `lefthook.yml` if needed
- Verify: `bun run check` passes (biome + types + tests)

---

## Next.js → React Router mapping

| Next.js | React Router Framework Mode |
|---|---|
| `app/layout.tsx` | `app/root.tsx` (html shell + providers) |
| `app/page.tsx` | `app/routes/home.tsx` (with `loader` for data) |
| `app/(group)/page.tsx` | `app/routes/group.tsx` or nested layout route |
| N/A | `app/entry.client.tsx` (client hydration) |
| N/A | `app/entry.server.tsx` (SSR handler) |
| `next/link` | `react-router: Link` |
| `next/image` | native `<img>` + custom logic |
| `next/navigation: usePathname` | `react-router: useLocation` |
| `next/navigation: useRouter` | `react-router: useNavigate` |
| `next/dynamic` | `React.lazy` + `Suspense` |
| `next/font/local` | `@font-face` in CSS |
| Server Components | Route loaders |
| Server Actions | Route actions |
| `proxy.ts` (middleware) | React Router middleware |
| `Metadata` export | `meta` function export on routes |
| `generateStaticParams` | Not needed (or `clientLoader`) |

## Files that need NO changes (framework-agnostic)
- `utils/math.ts`, `utils/easings.ts`, `utils/animation.ts`, `utils/raf.ts`, `utils/fetch.ts`, `utils/strings.ts`, `utils/viewport.ts`, `utils/context.ts`
- `styles/colors.ts`, `styles/easings.ts`, `styles/layout.mjs`, `styles/typography.ts`, `styles/config.ts`
- `styles/css/reset.css`, `styles/css/global.css`, `styles/css/root.css` (generated), `styles/css/tailwind.css` (generated)
- `hooks/store.ts`, `hooks/use-device-detection.ts`, `hooks/use-scroll-trigger.ts`, `hooks/use-transform.tsx`, `hooks/use-sync-external.ts`
- `components/marquee/`, `components/fold/`, `components/scrollbar/`, `components/real-viewport.tsx`, `components/scroll-restoration.tsx`
- `features/animation/gsap.tsx`, `features/animation/split-text.tsx`, `features/animation/progress-text/`
- `postcss.config.mjs`

## Files that need rewrites
| File | Change |
|---|---|
| `components/image.tsx` | Remove next/image → native img with srcSet/sizes |
| `components/link.tsx` | next/link → RR Link, usePathname → useLocation |
| `components/theme.tsx` | usePathname → useLocation |
| `components/lenis.tsx` | next/dynamic → React.lazy |
| `features/animation/animated-gradient/index.tsx` | next/dynamic → React.lazy |
| `hooks/use-prefetch.ts` | next/navigation → RR prefetch |
| `styles/fonts.ts` | next/font/local → @font-face in CSS (file may be deleted) |
| `env.ts` | Minor: remove NEXT_PUBLIC_ prefix convention or keep for compat |

## Verification

After each phase:
1. `bun dev` — app runs without errors
2. `bun run check` — biome + typecheck pass (add back incrementally)
3. Visual check — page renders correctly with styles, fonts, scroll

After Phase 8 (final):
1. `bun run build` — production build succeeds
2. `bun run preview` — production preview works
3. No `next` or `next/` imports anywhere in codebase
4. `grep -r "from 'next" --include="*.ts" --include="*.tsx"` returns nothing
