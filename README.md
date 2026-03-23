[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satus

A React Router starter with React 19, Tailwind CSS v4, and optional WebGL. _Satus_ means "beginning" in Latin.

## Requirements

| Tool    | Version   |
| ------- | --------- |
| Node.js | >= 22.0.0 |
| pnpm    | >= 10.0.0 |

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Tech Stack

| Category     | Technologies                              |
| ------------ | ----------------------------------------- |
| Framework    | React Router 7 (SSR), React 19, TypeScript |
| Styling      | Tailwind CSS v4, CSS Modules, Lightning CSS |
| Optional     | React Three Fiber, GSAP, Theatre.js, Sanity |
| Tooling      | Vite+, pnpm, Oxlint, Oxfmt               |
| Env          | t3-env, Valibot                           |

## Project Structure

```
app/                    # React Router routes and layouts
components/             # Reusable UI components
hooks/                  # Custom React hooks
utils/                  # Pure utility functions
styles/                 # Design system, Tailwind config, CSS generation
integrations/           # Third-party services (Sanity)
dev/                    # Debug tools (Orchestra, Theatre.js)
webgl/                  # 3D graphics system (R3F)
```

## Commands

```bash
vp dev               # Dev server
vp build             # Production build
vp check             # Lint + format + typecheck
vp lint              # Oxlint
vp fmt               # Oxfmt
```

## Key Conventions

- **Path alias**: `~/` maps to project root
- **Components**: Use `~/components/image` and `~/components/link`
- **CSS Modules**: Import as `s` → `import s from './component.module.css'`
- **Env vars**: `PUBLIC_` prefix for client, plain for server. Validated with t3-env + Valibot
- **Debug tools**: Toggle with `Ctrl+O` / `Cmd+Shift+O` / `Cmd+.`

## License

MIT — Built by [darkroom.engineering](https://darkroom.engineering)
