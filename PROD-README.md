# [PROJECT NAME]

## Quick Start

```bash
bun install
vercel link && vercel env pull
bun dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Development server |
| `bun build` | Production build |
| `bun lint` | Run linter |
| `bun setup:styles` | Regenerate CSS |

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Bun

## Project Structure

```
app/           # Pages and routes
components/    # UI components
lib/           # Hooks, utils, integrations
```

## Content Management

Edit content at `/studio`. Changes publish via webhooks.

Manual cache clear: `GET https://[domain]/api/revalidate`

## Deployment

Push to `main` branch for Vercel deployment.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | `bun install` + check env vars |
| Styles not updating | `bun setup:styles` + restart |
| CMS not connecting | Check Sanity env vars + CORS |

---

Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)
