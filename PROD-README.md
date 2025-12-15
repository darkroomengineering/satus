# [PROJECT NAME]

Production documentation for [PROJECT NAME], built with the Satūs framework by [darkroom.engineering](https://darkroom.engineering).

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

Required in `.env.local`:

```env
# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
SANITY_API_WRITE_TOKEN="your-write-token"

# Base URL
NEXT_PUBLIC_BASE_URL="https://your-domain.com"

# GSAP (if using premium features)
GSAP_AUTH_TOKEN="your-gsap-token"
```

## Core Technologies

### Content Management
- **Sanity Studio**: Access at `/studio`
- **Revalidation Webhook**: `https://your-domain.com/api/revalidate`
- [Sanity Documentation](lib/integrations/sanity/README.md)

### Animation
- **GSAP**: General animations and timeline sequences
- **Theatre.js**: Complex animation choreography
- [GSAP Documentation](components/gsap/README.md)

### Styling
- **Hybrid System**: Tailwind CSS v4 + PostCSS
- **Responsive Units**: `mobile-vw()` and `desktop-vw()` functions
- **Grid**: 4 columns (mobile) / 12 columns (desktop)
- [Styling Documentation](styles/README.md)

## Tech Stack

**Core**
- Next.js, React, TypeScript, Bun

**3D & Animation**
- Three.js, React Three Fiber, Theatre.js, GSAP

**Integrations**
- Sanity, HubSpot, Shopify

**UI & Styling**
- CSS Modules, Tailwind CSS, Base UI

**Performance**
- Lenis, Hamo, Tempus, Zustand

## Available Scripts

```bash
bun dev              # Development server
bun build            # Production build
bun start            # Start production server
bun lint             # Run linter
bun typecheck        # TypeScript validation
bun setup:styles     # Regenerate styles
bun analyze          # Bundle analysis
```

## Debug Tools (CMD+O)

- Theatre.js Studio (⚙️)
- Performance Stats (📈)
- Grid Debug (🌐)
- Development Mode (🚧)
- Minimap (🗺️)

## Project Structure

```
project/
├── app/                # Next.js pages and routes
├── components/         # Shared UI components
├── lib/                # Everything non-UI
│   ├── integrations/  # Sanity, Shopify, HubSpot
│   ├── webgl/         # 3D graphics
│   ├── dev/           # Debug tools (CMD+O)
│   ├── scripts/       # CLI tools
│   └── styles/        # CSS & Tailwind
└── public/            # Static assets
```

## Documentation

- [Lib](lib/README.md) - Utilities, hooks, and features
- [Integrations](lib/integrations/README.md) - Third-party integrations
- [Styles](lib/styles/README.md) - CSS & Tailwind system
- [Components](components/README.md) - UI components
- [WebGL Components](lib/webgl/README.md) - 3D graphics

## Deployment

### Pre-deployment Checklist
1. ✅ Environment variables set in Vercel
2. ✅ Sanity webhooks configured
3. ✅ SSL certificates configured
4. ✅ Performance metrics validated

### Monitoring
- Vercel Analytics Dashboard
- Lighthouse CI Reports
- Performance hooks (`hooks/use-performance.ts`)

### Content Updates
- Content changes via Sanity auto-update via webhooks
- Code changes deploy via Vercel
- Manual cache clear: `https://your-domain.com/api/revalidate`

## Common Issues

**Sanity Visual Editor Not Working**
- Check environment variables
- Verify draft mode configuration (`/api/draft-mode/enable`)
- Ensure `NEXT_PUBLIC_BASE_URL` is set

**Style Updates Not Reflecting**
- Run `bun setup:styles`
- Clear browser cache
- Verify deployment status

**Performance Issues**
- Check Theatre.js sequences
- Monitor GSAP animations
- Verify WebGL performance

---

Built with [Satūs](https://github.com/darkroomengineering/satus) by [darkroom.engineering](https://darkroom.engineering)
