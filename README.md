[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern Next.js 16 starter with React 19, Tailwind CSS v4, and optional WebGL. _Satūs_ means "beginning" in Latin.

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
- **Modern tooling** — Bun, Turbopack, and the oxc toolchain: `oxlint` and `oxfmt` cover TS, CSS, Markdown, YAML and TOML, and sort imports and Tailwind classes for you at format time

## Requirements

| Tool    | Version   | Notes                                     |
| ------- | --------- | ----------------------------------------- |
| Node.js | >= 22.0.0 | Required for native fetch and modern APIs |
| Bun     | >= 1.3.5  | Package manager & runtime                 |

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
- **Choose what to keep** — `bun run setup:project` strips everything else. Keeping an integration also keeps whatever it requires (e.g. keeping `theatre` keeps `webgl`, since theatre's r3f bindings depend on it).

### Setup

`setup:project` is interactive by default, or drivable non-interactively (CI): `--preset <key>` or `--keep <id,id,...>` selects the integration set, `--yes` confirms it, `--clean-homepage` swaps in a blank starter homepage, and `--skip-install` skips the lockfile update.

When setup completes it removes its own machinery from the project (the setup script and its test suite) — `generate`, `doctor`, and `dev` stay.

## Tech Stack

| Category  | Technologies                                      |
| --------- | ------------------------------------------------- |
| Framework | Next.js 16, React 19.2, TypeScript                |
| Styling   | Tailwind CSS v4, CSS Modules                      |
| Catalogue | Storybook                                         |
| Optional  | React Three Fiber, GSAP, Sanity, Shopify, HubSpot |
| Tooling   | Bun, oxlint + oxfmt, Turbopack                    |

> **Note**: `hamo` and `tempus` are Darkroom-owned packages. Both reached a stable 1.0 on 2026-07-29, so they follow semver and track caret ranges like everything else.

## How it compares

Satus is built for one job: content-driven marketing and creative sites with real motion, a CMS, and sometimes a storefront. The usual alternatives are good at different jobs — here is where the lines actually are, checked against each project in August 2026.

| Starter           | Built for                              | Next.js today                          | What it gives you that Satus doesn't                                                 |
| ----------------- | -------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------ |
| `create-next-app` | a bare framework scaffold, no opinions | 16.3, `cacheComponents` off by default | nothing to unlearn — and nothing included: no CMS, tests, CI, or component library   |
| `next-forge`      | SaaS products in a Turborepo           | 16.1                                   | auth, payments, database, and email wired end to end (Clerk, Stripe, Prisma, Resend) |
| `create-t3-app`   | typesafe full-stack apps               | 15.5                                   | tRPC + ORM + auth scaffolding, and the largest community of the four                 |
| `next-enterprise` | enterprise app platforms               | 15.5                                   | OpenTelemetry, Kubernetes health checks, CI bundle-size and performance tracking     |

What none of them ship, and Satus does:

- Next 16.3 with `cacheComponents` and instant navigations already on — opt-in everywhere else, including `create-next-app`
- Bun as runtime and test runner, the oxc toolchain (`oxlint` + `oxfmt`), and a single TypeScript 7
- Tailwind v4 and CSS Modules under an explicit cascade contract, so utility and module styles can't silently fight
- Strippable integrations: `bun run setup:project` removes what you don't keep, and the enforced CSP recomposes itself from what's left
- The creative-site stack — Lenis, GSAP, Tempus, optional WebGL — plus e2e tests asserting a11y and instant navigation, a Lighthouse workflow, and an asset-weight gate

Pick something else when the job is different: `next-forge` for a SaaS with billing, `create-t3-app` when the product is a typesafe API-heavy app, `next-enterprise` when the org runs Kubernetes and wants observability from day one. For a content site that has to move well and ship fast, this is the shorter path.

## Project Structure

```
app/                    # Next.js routes ((site)/page.tsx is the manual; the root layout is a bare shell shared with /studio)
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

| Area                  | Documentation                                                                    |
| --------------------- | -------------------------------------------------------------------------------- |
| Engineering Standards | [AGENTS.md](AGENTS.md) - Canonical rules for all AI tools and contributors       |
| Architecture          | [ARCHITECTURE.md](ARCHITECTURE.md) - Key decisions, patterns, customization      |
| Component Catalogue   | Storybook (`bun storybook`) - Isolated UI primitives with docs                   |
| Component Inventory   | [COMPONENTS.md](COMPONENTS.md) - Auto-generated component/hook/utility manifest  |
| Changelog             | [CHANGELOG.md](CHANGELOG.md) - Release history and versioning policy             |
| App Router            | [app/README.md](app/README.md) - Pages, layouts, routing                         |
| Components            | [components/README.md](components/README.md) - UI reference                      |
| Library               | [lib/README.md](lib/README.md) - Hooks, utils, integrations                      |
| Integrations          | [lib/integrations/README.md](lib/integrations/README.md) - Sanity, Shopify, etc. |

## Scripts

```bash
bun dev              # Development server
bun run build        # Production build
bun storybook        # Component catalogue
bun lint             # oxlint
bun run format       # oxfmt (also sorts imports + Tailwind classes)
bun run check        # lint + format + types + tests (run this before pushing)
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

**Optional GitHub Secrets** for the Lighthouse CI workflow: `VERCEL_TOKEN`
(Vercel API token — the job skips gracefully with a warning when it's absent
or invalid) and `VERCEL_AUTOMATION_BYPASS_SECRET` (needed when previews are
Deployment Protection-guarded — the audit step skips loudly without it
instead of scoring the SSO login page).

See [ARCHITECTURE.md](ARCHITECTURE.md) for deployment checklist and cache strategies.

## License

MIT - Built by [darkroom.engineering](https://darkroom.engineering)
