[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and optional WebGL. _Satūs_ means "beginning" in Latin.

Run `bun dev` and open [localhost:3000](http://localhost:3000) — the landing page is a step-by-step manual that walks you from a fresh clone to a shippable site. The rest of this README is the reference version.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darkroomengineering/satus)

> **Note**: This README is for template developers. For client handoff, see [PROD-README.md](PROD-README.md).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/darkroomengineering/satus&project-name=satus&repository-name=satus)

> After deploying, set `NEXT_PUBLIC_BASE_URL` to your domain in the project's environment variables — it drives SEO, canonical URLs, sitemaps, and social cards.

## Features

- **Next.js 16 + React 19** — App Router with `cacheComponents` and instant navigations on, React Compiler, strict TypeScript
- **Tailwind v4 + CSS Modules** — side by side under one cascade contract, so utility and module styles can't silently fight
- **Storybook** — UI primitives catalogued in Storybook (`bun storybook`), with controls and docs
- **Opt-in integrations** — Sanity, Shopify, HubSpot, and Mailchimp stay isolated under `lib/integrations`; WebGL lives under `lib/webgl` behind `lib/features`; `bun run setup:project` strips the rest
- **Bun + oxc toolchain** — Bun as runtime and test runner; `oxlint` and `oxfmt` cover TS, CSS, Markdown, YAML and TOML, and sort imports and Tailwind classes at format time

## Quick Start

Requires Node.js >= 24.20 and Bun >= 1.3.5.

```bash
bun install
cp .env.example .env.local   # set NEXT_PUBLIC_BASE_URL
bun dev                      # open localhost:3000 for the manual
```

Trim what you don't need: `bun run setup:project` strips unused integrations (code, deps, env) interactively. Details, including the non-interactive flags, live in [lib/integrations/README.md](lib/integrations/README.md).

## Project Structure

```
app/                    # Next.js routes ((site)/page.tsx is the manual; the root layout is a bare shell shared with /studio); llms.txt/, agent-content/, sitemap.ts, robots.ts, and manifest.ts (AEO surfaces) live at the app/ root
components/             # UI components (Storybook for the interactive ones)
lib/                    # Everything non-UI
  ├── hooks/           # Custom React hooks
  ├── integrations/    # Opt-in plugins (Sanity, Shopify, HubSpot…)
  ├── features/        # Feature flags gating opt-in surfaces (e.g. WebGL)
  ├── webgl/           # 3D graphics (opt-in, behind lib/features)
  ├── seo/             # Sitemap, robots, and metadata helpers
  ├── utils/           # Pure utilities
  ├── scripts/         # CLI tools (setup:project, handoff, generate)
  ├── styles/          # CSS & Tailwind
  └── dev/             # Debug tools (optional)
```

> **Mental model:** UI → `components/`, everything else → `lib/`. Integrations are opt-in plugins, not baked-in defaults. Conventions live in [AGENTS.md](AGENTS.md).

## Documentation

| Area                  | Documentation                                                                          |
| --------------------- | -------------------------------------------------------------------------------------- |
| Engineering Standards | [AGENTS.md](AGENTS.md) - Canonical rules for all AI tools and contributors             |
| Architecture          | [ARCHITECTURE.md](ARCHITECTURE.md) - Key decisions, patterns, customization            |
| Security              | [SECURITY.md](SECURITY.md) - Security policy, CSP composition, vulnerability reporting |
| Component Catalogue   | Storybook (`bun storybook`) - Isolated UI primitives with docs                         |
| Component Inventory   | [COMPONENTS.md](COMPONENTS.md) - Auto-generated component/hook/utility manifest        |
| Changelog             | [CHANGELOG.md](CHANGELOG.md) - Release history and versioning policy                   |
| App Router            | [app/README.md](app/README.md) - Pages, layouts, routing                               |
| API Routes            | [app/api/README.md](app/api/README.md) - Endpoint reference, webhook setup             |
| Components            | [components/README.md](components/README.md) - UI reference                            |
| Library               | [lib/README.md](lib/README.md) - Hooks, utils, integrations                            |
| Integrations          | [lib/integrations/README.md](lib/integrations/README.md) - Sanity, Shopify, etc.       |
| Everything else       | AGENTS.md § Documentation Map lists every README in the repo                           |

## Scripts

```bash
bun dev              # Development server
bun run build        # Production build
bun storybook        # Component catalogue
bun run check        # lint + format check + type-aware lint + typegen + tsc + unit tests + oxlint-plugin tests + manifest + asset budget (run before pushing)
bun run setup:project  # Strip integrations you don't need
bun run handoff      # Client delivery: strips branding, swaps in PROD-README, generates inventory (--dry-run, --force)
```

The full list lives in `package.json`.

## Deployment

```bash
vercel
```

`vercel` (or the Deploy button above) links and deploys the project the first time. Once the project is linked, push to the tracked branch and Vercel deploys automatically — the CLI is only needed again for manual/preview deploys.

**Optional GitHub Secrets** for the Lighthouse CI workflow: `VERCEL_TOKEN`
(Vercel API token — the job skips gracefully with a warning when it's absent
or invalid) and `VERCEL_AUTOMATION_BYPASS_SECRET` (needed when previews are
Deployment Protection-guarded — the audit step skips loudly without it
instead of scoring the SSO login page).

See [ARCHITECTURE.md](ARCHITECTURE.md) for the deployment checklist, cache strategies, and hosting Storybook at `/storybook`.

## How it compares

Satus is built for one job: content-driven marketing and creative sites with real motion, a CMS, and sometimes a storefront. The usual alternatives are good at different jobs — here is where the lines actually are, checked against each project in August 2026.

| Feature                                         | Satūs                                | `create-next-app` | `next-forge`   | `create-t3-app`          | `next-enterprise` |
| ----------------------------------------------- | ------------------------------------ | ----------------- | -------------- | ------------------------ | ----------------- |
| Built for                                       | creative & marketing sites           | bare scaffold     | SaaS monorepo  | typesafe full-stack apps | enterprise apps   |
| Next.js today                                   | 16.3                                 | 16.3              | 16.1           | 15.5                     | 15.5              |
| Instant navigations on (`cacheComponents`)      | ✓                                    | ✗ opt-in          | ✗              | ✗                        | ✗                 |
| Bun runtime + test runner                       | ✓                                    | ✗                 | ✗              | ✗                        | ✗                 |
| oxc toolchain (`oxlint` + `oxfmt`)              | ✓                                    | ✗                 | ✗              | ✗                        | ✗                 |
| Tailwind + CSS Modules under a cascade contract | ✓                                    | ✗                 | ✗              | ✗                        | ✗                 |
| Animation stack (Lenis, GSAP, Tempus)           | ✓                                    | ✗                 | ✗              | ✗                        | ✗                 |
| WebGL module (React Three Fiber)                | ✓ opt-in                             | ✗                 | ✗              | ✗                        | ✗                 |
| CMS integration                                 | ✓ Sanity                             | ✗                 | ✓              | ✗                        | ✗                 |
| E-commerce storefront                           | ✓ Shopify                            | ✗                 | ✗              | ✗                        | ✗                 |
| Auth                                            | ✗                                    | ✗                 | ✓ Clerk        | ✓                        | ✗                 |
| Payments                                        | ✗                                    | ✗                 | ✓ Stripe       | ✗                        | ✗                 |
| Database / ORM                                  | ✗                                    | ✗                 | ✓ Prisma       | ✓                        | ✗                 |
| Turborepo monorepo                              | ✗                                    | ✗                 | ✓              | ✗                        | ✗                 |
| Pick your pieces                                | ✓ strip after clone                  | ✗                 | ✗              | ✓ choose at init         | ✗                 |
| Unit tests                                      | ✓ `bun test`                         | ✗                 | ✓ Vitest       | ✗                        | ✓ Vitest          |
| E2E tests (Playwright)                          | ✓ with a11y + instant-nav asserts    | ✗                 | ✗              | ✗                        | ✓                 |
| Storybook                                       | ✓                                    | ✗                 | ✓              | ✗                        | ✓                 |
| CI quality gates                                | ✓                                    | ✗                 | ✗ release only | ✗                        | ✓                 |
| Performance budgets in CI                       | ✓ asset weight (Lighthouse advisory) | ✗                 | ✗              | ✗                        | ✓ bundle size     |
| Security headers + rate limiting                | ✓ enforced CSP, composed             | ✗                 | ✓ Arcjet       | ✗                        | ✗                 |
| Observability wired                             | ✗                                    | ✗                 | ✓              | ✗                        | ✓ OpenTelemetry   |
| Agent-ready docs                                | ✓ AGENTS.md + llms.txt + manifest    | ✓ AGENTS.md       | ✗              | ✗                        | ✗                 |

Pick something else when the job is different: `next-forge` for a SaaS with billing, `create-t3-app` when the product is a typesafe API-heavy app, `next-enterprise` when the org runs Kubernetes and wants observability from day one. For a content site that has to move well and ship fast, this is the shorter path.

## License

MIT - Built by [darkroom.engineering](https://darkroom.engineering)
