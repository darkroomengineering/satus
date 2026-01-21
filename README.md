[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and optional WebGL. *Satūs* means "beginning" in Latin.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darkroomengineering/satus)

> **Note**: This README is for template developers. For client handoff, see [PROD-README.md](PROD-README.md).

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 22.0.0 | Required for native fetch and modern APIs |
| Bun | >= 1.3.5 | Package manager & runtime |

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
bun run handoff      # Prepare for client delivery
```

## Client Handoff

Prepare the codebase for client delivery:

```bash
bun run handoff
```

This interactive script:
- Removes example pages and Satūs branding
- Swaps README with production version
- Generates component inventory
- Updates package.json with project name

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

MIT — Built by [darkroom.engineering](https://darkroom.engineering)
