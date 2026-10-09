[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and optional WebGL. _Satūs_ means "beginning" in Latin.

Run `bun dev` and open [localhost:3000](http://localhost:3000) — the landing page is a step-by-step manual that walks you from a fresh clone to a shippable site. The rest of this README is the reference version.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darkroomengineering/satus)

> **Note**: This README is for template developers. For client handoff, see [PROD-README.md](PROD-README.md).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/darkroomengineering/satus&project-name=satus&repository-name=satus)

> After deploying, run `bun run env:setup` once your project has env vars (see [Environment variables](#environment-variables)). The base URL for SEO, canonical URLs, sitemaps, and social cards comes from Vercel; `NEXT_PUBLIC_BASE_URL` only overrides it.

## Features

- **Next.js 16 + React 19** — App Router with `cacheComponents` and instant navigations on, React Compiler, strict TypeScript
- **Tailwind v4 + CSS Modules** — side by side under one cascade contract, so utility and module styles can't silently fight
- **Opt-in integrations** — Sanity, Shopify, HubSpot, and Mailchimp stay isolated under `lib/integrations`; WebGL lives under `lib/webgl` behind `lib/features`; `bun run setup:project` strips the rest
- **Bun + oxc toolchain** — Bun as runtime and test runner; `oxlint` and `oxfmt` cover TS, CSS, Markdown, YAML and TOML, and sort imports and Tailwind classes at format time

## Quick Start

Requires Node.js >= 24.20 and Bun >= 1.4.0.

```bash
bun install
bun dev       # open localhost:3000 for the manual
```

Integrations switch on as you add their env vars, see [Environment variables](#environment-variables).

Trim what you don't need: `bun run setup:project` strips unused integrations (code, deps, env) interactively. Details, including the non-interactive flags, live in [lib/integrations/README.md](lib/integrations/README.md).

## Environment variables

A project's env vars are committed as one `.env` file, encrypted with [dotenvx](https://dotenvx.com). Satus itself ships none: a fork's first `bun dotenvx set` creates its `.env` and its own key (a shared `.env` would make every fork encrypt to satus's key). Next loads the file everywhere: `bun dev`, builds, Vercel production and preview, CI. Every value is encrypted, public ones included, and `lib/env-files.test.ts` fails on a plain one. Without the key nothing runs: `lib/env.ts` throws on any value it could not decrypt. Next decrypts the file on load through `@dotenvx/next-env`, which replaces `@next/env` via `overrides` in `package.json`. `bunfig.toml` turns off Bun's own `.env` loading, which would otherwise set the still-encrypted values first.

The base URL is not in the file. On Vercel, production uses `VERCEL_PROJECT_PRODUCTION_URL` and previews use their own `VERCEL_BRANCH_URL`, so share cards and absolute links on a preview point at that preview. Locally it falls back to localhost. Vercel's "Enable access to System Environment Variables" must stay on.

**Overrides:** when a key needs a different value locally or in builds, put only that key in an encrypted `.env.development` (for `bun dev`) or `.env.production` (for builds) with `bun dotenvx set KEY "value" -f .env.production`. Everything else still comes from `.env`. Each file has its own key, so add one only when a value really differs.

Private keys never go in git (`.env.keys` is ignored).

- **Starting a project:** `bun dotenvx set KEY "value"` for each variable (`.env.example` lists them). The first call creates `.env` and its key. Commit `.env`, then run `bun run env:setup`: it sends the key to GitHub (Actions and Dependabot secrets) and Vercel (production and preview) without printing it. It needs `gh` logged in and the folder linked with `vercel link`.
- **Joining a project:** get the line `DOTENV_PRIVATE_KEY="..."` from whoever set it up and put it in `.env.keys` at the repo root.
- **Adding or changing a variable:** `bun dotenvx set KEY "value"`, then commit `.env`. This needs only the public key in the file's header, not the private key. A new variable also goes in `lib/env.ts` and `.env.example`.
- **Reading a value:** `bun dotenvx get KEY`. **Removing one:** `bun dotenvx del KEY`.
- **Personal overrides:** `.env.local` is still loaded first and stays out of git.
- **Vercel:** `DOTENV_PRIVATE_KEY` is the only variable it needs. Values set in the Vercel dashboard override the file and can't be read back, so keep them out.
- **Client handoff:** the repo plus the private key. There is no vendor account to transfer.

To share the key: `bun dotenvx keypair DOTENV_PRIVATE_KEY` prints it.

## Project Structure

```
app/                    # Next.js routes ((site)/page.tsx is the manual; the root layout is a bare shell shared with /studio); llms.txt/, agent-content/, sitemap.ts, robots.ts, and manifest.ts (AEO surfaces) live at the app/ root
components/             # UI components
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

See [ARCHITECTURE.md](ARCHITECTURE.md) for the deployment checklist and cache strategies.

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
| Storybook                                       | ✗                                    | ✗                 | ✓              | ✗                        | ✓                 |
| CI quality gates                                | ✓                                    | ✗                 | ✗ release only | ✗                        | ✓                 |
| Performance budgets in CI                       | ✓ asset weight (Lighthouse advisory) | ✗                 | ✗              | ✗                        | ✓ bundle size     |
| Security headers + rate limiting                | ✓ enforced CSP, composed             | ✗                 | ✓ Arcjet       | ✗                        | ✗                 |
| Observability wired                             | ✗                                    | ✗                 | ✓              | ✗                        | ✓ OpenTelemetry   |
| Agent-ready docs                                | ✓ AGENTS.md + llms.txt + manifest    | ✓ AGENTS.md       | ✗              | ✗                        | ✗                 |

Pick something else when the job is different: `next-forge` for a SaaS with billing, `create-t3-app` when the product is a typesafe API-heavy app, `next-enterprise` when the org runs Kubernetes and wants observability from day one. For a content site that has to move well and ship fast, this is the shorter path.

## License

MIT - Built by [darkroom.engineering](https://darkroom.engineering)
