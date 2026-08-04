# [PROJECT NAME]

## Quick Start

```bash
bun install
vercel link && vercel env pull
bun dev
```

## Scripts

| Command            | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `bun dev`          | Development server                                                                |
| `bun run build`    | Production build                                                                  |
| `bun lint`         | Run linter                                                                        |
| `bun run check`    | Run oxlint + oxfmt --check + type-aware lint + typecheck + tests + manifest check |
| `bun setup:styles` | Regenerate CSS                                                                    |

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Bun

## Project Structure

```
app/           # Pages and routes
components/    # UI components
lib/
  hooks/       # Custom hooks + stores
  utils/       # Pure utilities
  styles/      # Design system, Tailwind config
  integrations/ # Third-party services (Sanity, Shopify, HubSpot)
  webgl/       # 3D graphics (optional)
  dev/         # Debug tools
  scripts/     # CLI tools
```

## Content Management

If the Sanity integration is enabled, manage content at [sanity.io/manage](https://sanity.io/manage) or through your project's Sanity Studio. Changes publish via webhooks.

Manual cache clear: `GET https://[domain]/api/revalidate`

## Deployment

Vercel deploys automatically on every push to `main`. If the project isn't linked yet, run `vercel link` once first (see Quick Start).

## Troubleshooting

| Issue               | Solution                       |
| ------------------- | ------------------------------ |
| Build fails         | `bun install` + check env vars |
| Styles not updating | `bun setup:styles` + restart   |
| CMS not connecting  | Check Sanity env vars + CORS   |

---

Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)
