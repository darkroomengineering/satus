# [PROJECT NAME]

Production documentation for [PROJECT NAME].

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Get environment variables from Vercel
vercel link
vercel env pull

# 3. Start development
bun dev
```

## Environment Variables

Required variables are configured in Vercel. For local development:

```bash
# Pull from Vercel
vercel env pull .env.local

# Or copy and fill in manually
cp .env.example .env.local
```

See `.env.example` for all available variables and their documentation.

## Tech Stack

| Category | Technologies |
|----------|--------------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, CSS Modules, PostCSS |
| Animation | GSAP, Lenis (smooth scroll) |
| CMS | Sanity (if configured) |
| Package Manager | Bun |

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun build` | Production build |
| `bun start` | Start production server |
| `bun lint` | Run linter |
| `bun typecheck` | TypeScript validation |
| `bun setup:styles` | Regenerate CSS utilities |

## Project Structure

```
app/                    # Next.js pages and routes
components/             # Shared UI components
  ├── ui/              # Base UI primitives
  ├── layout/          # Page layout components
  └── effects/         # Animation components
lib/                    # Non-UI code
  ├── integrations/    # Third-party services
  ├── hooks/           # React hooks
  ├── styles/          # CSS configuration
  └── utils/           # Utility functions
public/                 # Static assets
```

## Styling System

**Responsive Units:**
- `mobile-vw(px)` / `desktop-vw(px)` - Viewport-relative sizing
- `dr-*` utilities - Custom Tailwind classes for responsive scaling

**Grid:**
- 4 columns (mobile) / 12 columns (desktop)
- Use `dr-grid` class for grid layouts

## Content Updates

Content is managed through Sanity CMS at `/studio`.

Changes publish automatically via webhooks. For manual cache clearing:
```
GET https://[your-domain]/api/revalidate
```

## Deployment

Deployed via Vercel. Push to `main` branch to deploy.

### Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] Domain and SSL configured
- [ ] Build passes without errors
- [ ] Webhooks configured (if using CMS)

## Troubleshooting

**Build Fails**
1. Run `bun install` to ensure dependencies are current
2. Run `bun typecheck` to check for TypeScript errors
3. Check environment variables are set

**Styles Not Updating**
1. Run `bun setup:styles` to regenerate CSS
2. Clear browser cache
3. Restart development server

**CMS Not Connecting**
1. Verify Sanity environment variables
2. Check CORS settings in Sanity dashboard
3. Verify API tokens have correct permissions

## Support

For technical questions, contact the development team.

---

Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)
