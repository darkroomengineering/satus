# [PROJECT]

This is the production documentation for [PROJECT], built with the Satūs framework by [darkroom.engineering](https://darkroom.engineering).

## Setup:

The usual process for Next.js based apps/websites:

1. Install dependencies:

   ```bash
   bun install
   ```

2. Get the .env variables from Vercel:

   ```bash
   vercel link
   vercel env pull
   ```

3. Start development server:

   ```bash
   bun dev
   ```

   For HTTPS (required for Storyblok):
   
   ```bash
   bun dev:https
   ```

## Environment Variables

Required in `.env`:

```env
# Storyblok
STORYBLOK_PUBLIC_ACCESS_TOKEN="your-public-token"
STORYBLOK_PREVIEW_ACCESS_TOKEN="your-preview-token"
DRAFT_MODE_TOKEN="your-draft-mode-token"

# GSAP (if using premium features)
GSAP_AUTH_TOKEN="your-gsap-token"

# Base URL
NEXT_PUBLIC_BASE_URL="https://your-domain.com"
```

## Core Technologies:

### Content Management (Storyblok)
- Visual Editor: `https://your-domain.com/api/draft?secret=DRAFT_MODE_TOKEN&slug=/`
- Content Revalidation Webhook: `https://your-domain.com/api/revalidate`
- [Storyblok Documentation](docs/storyblok/README.md)

### Animation Systems
- GSAP for general animations
- Theatre.js for complex sequences
- [GSAP Documentation](docs/gsap/README.md)

### Styling System
- Hybrid approach with Tailwind CSS and PostCSS
- Responsive units: `mobile-vw()` and `desktop-vw()`
- Grid system: 4 columns (mobile) / 12 columns (desktop)
- [Styling Documentation](docs/styles/README.md)

## Documentation

Detailed documentation is available in the repository:

- [Styles System](styles/README.md) - Complete styling architecture and usage
- [GSAP Integration](docs/gsap/README.md) - Animation system setup and examples
- [Storyblok Integration](docs/storyblok/README.md) - CMS configuration and usage
- [Quick How-To Guide](docs/HOW-TO.md) - Common tasks and solutions
- [Root README](README.md) - Project overview and development setup

## Stack:

### Core
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh) (Runtime & Package Manager)

### 3D & Animation
- [Three.js](https://threejs.org/)
- [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)
- [@react-three/drei](https://github.com/pmndrs/drei)
- [Theatre.js](https://www.theatrejs.com/)
- [GSAP Business](https://greensock.com/gsap/)

### Integrations
- [Storyblok](https://www.storyblok.com/)
- [HubSpot](https://www.hubspot.com/)

### UI & Styling
- CSS Modules with PostCSS
- [Tailwind CSS](https://tailwindcss.com/)
- [clsx](https://github.com/lukeed/clsx)
- [Base UI](https://base-ui.com/)

### Development
- [Biome](https://biomejs.dev/)
- [Lefthook](https://github.com/evilmartians/lefthook)

### Performance & Utilities
- [Lenis](https://github.com/studio-freight/lenis)
- [Hamo](https://github.com/darkroomengineering/hamo) 
- [Tempus](https://github.com/darkroomengineering/tempus)
- [Zustand](https://github.com/pmndrs/zustand)

## Development Tools:

### Available Scripts
- `bun setup:styles` - Regenerate style configuration
- `bun typecheck` - TypeScript validation
- `bun lint` - Run Biome linting
- `bun analyze` - Bundle analysis

### Debug Tools
Access at `/debug/orchestra`:
- Theatre.js Studio (⚙️)
- Performance Stats (📈)
- Grid Debug (🌐)
- Development Mode (🚧)
- Minimap (🗺️)
- WebGL Debug (🧊)

## Deployment:

### Production Checks
1. Environment variables are set in Vercel
2. Storyblok webhooks are configured
3. GSAP license is valid (if using premium features)
4. SSL certificates are valid
5. Performance metrics are within acceptable ranges

### Monitoring
- Vercel Analytics Dashboard
- Lighthouse CI Reports
- [Performance Documentation](docs/performance/README.md)

### Content Updates
1. Content changes through Storyblok will automatically update via webhooks
2. For code changes, follow the standard Vercel deployment flow
3. Clear cache if needed: `https://your-domain.com/api/revalidate`

## Project Structure:

```
project/
├── app/                  # Next.js app directory
│   └── (pages)/         # Page components
│       └── r3f/         # Three.js components
├── components/          # Reusable components
├── libs/                # Core functionality
│   ├── storyblok/      # CMS integration
│   ├── theatre/        # Animation tooling
│   └── webgl/          # Three.js utilities
├── styles/             # Styling system
│   ├── css/            # Generated CSS
│   └── scripts/        # Style generation
└── docs/               # Documentation
```

## Support & Maintenance:

### Common Issues
1. **Storyblok Visual Editor Not Working**
   - Check SSL certificates
   - Verify draft mode token
   - Ensure correct preview URL in Storyblok

2. **Style Updates Not Reflecting**
   - Run `bun setup:styles`
   - Clear browser cache
   - Check deployment status

3. **Performance Issues**
   - Check Theatre.js sequences
   - Verify GSAP animations
   - Monitor WebGL performance

<!-- ### Contact
For technical support:
- Repository: [GitHub URL]
- Maintainers: [Contact Information]
- Documentation: [Documentation URL] -->