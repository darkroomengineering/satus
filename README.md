[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and optional WebGL. *Satūs* means "beginning" in Latin.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darkroomengineering/satus)

> **Note**: This README is for template developers. For client handoff, see [PROD-README.md](PROD-README.md).

Run `bun dev` and open [localhost:3000](http://localhost:3000) — the landing page is a step-by-step manual that walks you from a fresh clone to a shippable site. The rest of this README is the reference version.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/darkroomengineering/satus&project-name=satus&repository-name=satus)

> After deploying, set `NEXT_PUBLIC_BASE_URL` to your domain in the project's environment variables — it drives SEO, canonical URLs, sitemaps, and social cards.

## Features

- **Next.js 16 + React 19** — App Router with React 19.2 and strict TypeScript out of the box
- **Tailwind v4** — Tailwind CSS v4 alongside CSS Modules
- **Components in Storybook** — every UI primitive is catalogued in Storybook, isolated with controls and docs
- **Opt-in integrations** — Sanity, Shopify, HubSpot, and WebGL stay isolated under `lib/integrations` until you configure them
- **Interactive setup** — strip the integrations you don't need from a fresh clone
- **One-command handoff** — strips branding, swaps in the prod README, and generates a component inventory
- **Modern tooling** — Bun, Biome, and Turbopack

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 22.0.0 | Required for native fetch and modern APIs |
| Bun | >= 1.3.5 | Package manager & runtime |

## Quick Start

```bash
bun install
cp .env.example .env.local   # set NEXT_PUBLIC_BASE_URL
bun dev                      # open localhost:3000 for the manual
```

Trim what you don't need: `bun run setup:project` strips unused integrations (code, deps, env) interactively.

## Components live in Storybook

UI primitives are catalogued in Storybook rather than on an in-app page — isolated, with controls and autodocs. Source lives in `components/ui`; add a `*.stories.tsx` next to any new component.

```bash
bun storybook
```

**Hosting it (optional).** Storybook is its own static build, not a Next route. To serve it at `/storybook` on a deployment, create a second Vercel project from this repo (build command `bun run build-storybook`, output directory `storybook-static`), then set `NEXT_PUBLIC_STORYBOOK_URL` to its URL on the **Preview** environment. The app proxies `/storybook` to it there, and keeps the route disabled in Production by design.

## Integrations are opt-in plugins

Satūs keeps integrations — Sanity, Shopify, HubSpot, WebGL — isolated under `lib/integrations` (and `lib/webgl`). They only activate once you set their env vars, and each folder carries a `// USAGE` note showing how to wire it in. None is surfaced in the default app.

- **Use one** — set its env vars (see `lib/env.ts`) and follow the `// USAGE` reference in its folder.
- **Drop the ones you don't need** — `bun run setup:project`.
- **Coming next** — an additive `satus add <plugin>` CLI that injects an integration into a living project. Design captured in [#185](../../issues/185).

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Framework | Next.js 16, React 19.2, TypeScript |
| Styling | Tailwind CSS v4, CSS Modules |
| Catalogue | Storybook |
| Optional | React Three Fiber, GSAP, Sanity, Shopify, HubSpot |
| Tooling | Bun, Biome, Turbopack |

> **Note**: `hamo` and `tempus` are Darkroom-owned packages published on a `dev` pre-release dist-tag. They do not follow semver guarantees — pin exact versions and review changes when bumping.

## Project Structure

```
app/                    # Next.js pages and routes (page.tsx is the manual)
components/             # UI components (catalogued in Storybook)
lib/                    # Everything non-UI
  ├── hooks/           # Custom React hooks
  ├── integrations/    # Opt-in plugins (Sanity, Shopify, HubSpot…)
  ├── styles/          # CSS & Tailwind
  ├── webgl/           # 3D graphics (opt-in)
  └── dev/             # Debug tools (optional)
```

> **Mental model:** UI → `components/`, everything else → `lib/`. Integrations are opt-in plugins, not baked-in defaults.

## Documentation

| Area | Documentation |
|------|---------------|
| Engineering Standards | [AGENTS.md](AGENTS.md) - Canonical rules for all AI tools and contributors |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) - Key decisions, patterns, customization |
| Component Catalogue | Storybook (`bun storybook`) - Isolated UI primitives with docs |
| Component Inventory | [COMPONENTS.md](COMPONENTS.md) - Auto-generated component/hook/utility manifest |
| Changelog | [CHANGELOG.md](CHANGELOG.md) - Release history and versioning policy |
| App Router | [app/README.md](app/README.md) - Pages, layouts, routing |
| Components | [components/README.md](components/README.md) - UI reference |
| Library | [lib/README.md](lib/README.md) - Hooks, utils, integrations |
| Integrations | [lib/integrations/README.md](lib/integrations/README.md) - Sanity, Shopify, etc. |

## Scripts

```bash
bun dev              # Development server
bun build            # Production build
bun storybook        # Component catalogue
bun lint             # Biome linter
bun run generate     # Generate pages/components
bun run setup:project  # Strip integrations you don't need
bun run handoff      # Prepare for client delivery
```

## Client Handoff

Prepare the codebase for client delivery:

```bash
bun run handoff
```

This interactive script:
- Removes Satūs branding
- Swaps README with the production version
- Generates a component inventory
- Updates package.json with the project name

## Key Conventions

- **Images**: Use `@/components/ui/image` (never `next/image` directly)
- **Links**: Use `@/components/ui/link` (auto-handles external links)
- **CSS Modules**: Import as `s` → `import s from './component.module.css'`
- **Debug Tools**: Toggle with `Cmd/Ctrl + O`

## Deployment

```bash
vercel
```

**Required GitHub Secret**: `VERCEL_TOKEN` for Lighthouse CI workflow.

See [ARCHITECTURE.md](ARCHITECTURE.md) for deployment checklist and cache strategies.

## License

MIT - Built by [darkroom.engineering](https://darkroom.engineering)
