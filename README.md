[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and optional WebGL. *Satūs* means "beginning" in Latin.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darkroomengineering/satus)

> **Note**: This README is for template developers. For client handoff, see [PROD-README.md](PROD-README.md).

## Quick Start

```bash
bun install
bun run setup:project    # Interactive setup - choose integrations
cp .env.example .env.local
bun dev
```

Or skip setup and keep everything: `bun install && bun dev`

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Framework | Next.js 16, React 19.2, TypeScript |
| Styling | Tailwind CSS v4, CSS Modules |
| Optional | React Three Fiber, GSAP, Sanity, Shopify, HubSpot |
| Tooling | Bun, Biome, Turbopack |

## Project Structure

```
app/                    # Next.js pages and routes
components/             # UI components
lib/                    # Everything non-UI
  ├── hooks/           # Custom React hooks
  ├── integrations/    # Third-party services
  ├── styles/          # CSS & Tailwind
  ├── webgl/           # 3D graphics (optional)
  └── dev/             # Debug tools (optional)
```

> **Mental model:** UI → `components/`, everything else → `lib/`

## Documentation

| Area | Documentation |
|------|---------------|
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) — Key decisions & patterns |
| App Router | [app/README.md](app/README.md) — Pages, layouts, routing |
| Components | [components/README.md](components/README.md) — UI reference |
| Library | [lib/README.md](lib/README.md) — Hooks, utils, integrations |
| Integrations | [lib/integrations/README.md](lib/integrations/README.md) — Sanity, Shopify, etc. |

## Scripts

```bash
bun dev              # Development server
bun build            # Production build
bun lint             # Biome linter
bun run generate     # Generate pages/components
bun run setup:project  # Configure integrations
```

## Key Conventions

- **Images**: Use `~/components/ui/image` (never `next/image` directly)
- **Links**: Use `~/components/ui/link` (auto-handles external links)
- **CSS Modules**: Import as `s` → `import s from './component.module.css'`
- **Debug Tools**: Toggle with `Cmd/Ctrl + O`

## Optional Features

Toggle via environment variables in `.env.local`:

| Feature | Variable | Description |
|---------|----------|-------------|
| Page Transitions | `NEXT_PUBLIC_ENABLE_PAGE_TRANSITIONS=true` | GSAP-powered page transitions |
| WebGL | `NEXT_PUBLIC_ENABLE_WEBGL=false` | Disable WebGL (enabled by default) |

See [components/README.md](components/README.md) for usage details.

## Deployment

```bash
vercel
```

**Required GitHub Secret**: `VERCEL_TOKEN` for Lighthouse CI workflow.

See [ARCHITECTURE.md](ARCHITECTURE.md) for deployment checklist and cache strategies.

## License

MIT — Built by [darkroom.engineering](https://darkroom.engineering)
