# [PROJECT NAME]

## Quick Start

```bash
bun install
bun dev
```

Before `bun dev`, put the line `DOTENV_PRIVATE_KEY="..."` (handed over with the project) in a file called `.env.keys` at the repo root. `bun run doctor` checks it worked.

## Environment variables

Env vars live in the repo as one encrypted `.env` file. The private key above decrypts it; keep it out of git and out of chat tools.

- Change or add a value: `bun dotenvx set KEY "value"`, then commit `.env`.
- Read a value: `bun dotenvx get KEY`.
- Vercel needs only `DOTENV_PRIVATE_KEY`, set as a Secret for Production and Preview. Don't add other variables in the Vercel dashboard: they override the file.

## Scripts

| Command            | Description                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- |
| `bun dev`          | Development server                                                                    |
| `bun run build`    | Production build                                                                      |
| `bun lint`         | Run linter                                                                            |
| `bun run check`    | Lint, format check, type-aware lint, typecheck, unit tests, manifest and asset checks |
| `bun setup:styles` | Regenerate CSS                                                                        |

## Tech Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Bun

## Project Structure

```
app/                    # Next.js routes; llms.txt/, agent-content/, sitemap.ts, robots.ts, and manifest.ts (AEO surfaces) live at the app/ root
components/             # UI components
lib/                    # Everything non-UI
  ├── hooks/           # Custom React hooks
  ├── integrations/    # Third-party services (Sanity, Shopify, HubSpot)
  ├── features/        # Feature flags gating opt-in surfaces (e.g. WebGL)
  ├── webgl/           # 3D graphics (optional, behind lib/features)
  ├── seo/             # Sitemap, robots, and metadata helpers
  ├── utils/           # Pure utilities
  ├── scripts/         # CLI tools
  ├── styles/          # Design system, Tailwind config
  └── dev/             # Debug tools
```

## Content Management

If the Sanity integration is enabled, manage content at [sanity.io/manage](https://sanity.io/manage) or through your project's Sanity Studio. Changes publish via webhooks.

Content updates publish through webhooks (Sanity publish, Shopify product/collection updates), which call `POST /api/revalidate`. To trigger it by hand: `curl -X POST "https://[domain]/api/revalidate?secret=$SHOPIFY_REVALIDATION_SECRET"` for Shopify tags, or re-publish the document in Sanity Studio. GET is not supported.

## Deployment

Vercel deploys automatically on every push to `main`. If the project isn't linked yet, run `vercel link` once first (see Quick Start).

## Troubleshooting

| Issue               | Solution                                           |
| ------------------- | -------------------------------------------------- |
| Build fails         | `bun install` + `bun run doctor` (is the key set?) |
| Styles not updating | `bun setup:styles` + restart                       |
| CMS not connecting  | Check Sanity env vars + CORS                       |

---

Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)
