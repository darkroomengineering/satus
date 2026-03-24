# [PROJECT NAME]

## Quick Start

```bash
bun install
vercel link && vercel env pull
bun dev
```

## Scripts

| Command         | Description        |
| --------------- | ------------------ |
| `bun dev`       | Development server |
| `bun run build` | Production build   |
| `bun run check` | Lint + typecheck   |

## Tech Stack

React Router 7 (SSR), React 19, TypeScript, Tailwind CSS v4, Vite 8

## Project Structure

```
app/              # Routes and layouts
components/       # UI components
hooks/            # Custom hooks
utils/            # Pure utilities
styles/           # Design system, Tailwind config
integrations/     # Third-party services (Sanity)
webgl/            # 3D graphics (optional)
dev/              # Debug tools
```

## Deployment

Push to `main` branch for Vercel deployment.

## Troubleshooting

| Issue               | Solution                   |
| ------------------- | -------------------------- |
| Build fails         | `bun install` + check envs |
| Styles not updating | Restart dev server         |
| CMS not connecting  | Check Sanity env vars      |

---

Built with [Satus](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)
