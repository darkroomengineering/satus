[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern, high-performance React application starter with Next.js 15, React 19, Tailwind CSS v4, and advanced WebGL capabilities. Satūs means "start" or "beginning" in Latin, serving as a foundation for new projects.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darkroomengineering/satus)

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment variables
cp .env.example .env.local

# Start development server with Turbopack
bun dev

# Build for production
bun build

# Start production server
bun start
```

## 🛠 Tech Stack

- **[Next.js](https://nextjs.org)** - React framework with App Router and Turbopack
- **[React 19.1.0](https://react.dev)** - Latest React with simplified ref handling
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com)** - CSS-first configuration
- **[React Three Fiber](https://docs.pmnd.rs/react-three-fiber)** - React renderer for Three.js
- **[GSAP](https://greensock.com/gsap/)** - Timeline-based animations
- **[Biome](https://biomejs.dev)** - Fast formatter and linter
- **[Bun](https://bun.sh)** - All-in-one JavaScript runtime

## 📁 Project Structure

```
satus/
├── app/                    # Next.js App Router pages and layouts
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── integrations/           # Third-party service integrations
│   ├── hubspot/           # HubSpot forms integration
│   ├── shopify/           # E-commerce functionality
│   └── sanity/            # Headless CMS
├── libs/                   # Utility functions and helpers
├── orchestra/              # Debug and development tools
│   ├── grid/              # Grid overlay
│   ├── minimap/           # Page minimap
│   ├── stats/             # Performance stats
│   └── theatre/           # Animation tools
├── styles/                 # Global styles and configuration
├── webgl/                  # 3D graphics and WebGL components
└── public/                 # Static assets
```

## Key Features

### Performance Optimized
- **Turbopack** for lightning-fast HMR in development
- **React Server Components** by default
- **Dynamic imports** for code splitting
- **Image optimization** with a custom thin wrapper around Next.js Image
- **Font optimization** with Next.js Font

### Modern Styling
- **Tailwind CSS v4** with CSS-first configuration
- **CSS Modules** for component styles
- **Custom viewport units** (`mobile-vw`, `desktop-vw`)
- **Theme support** with CSS variables

### Advanced Graphics
- **WebGL/Three.js** integration with React Three Fiber
- **Post-processing effects** pipeline
- **Shader support** with GLSL
- **Theatre.js** for animation debugging
- **Optimized 3D performance**

### Developer Experience
- **TypeScript** with strict mode
- **Biome** for consistent code style
- **Hot Module Replacement** with Turbopack
- **Git hooks** with Lefthook
- **Debug tools** accessible with `CMD+O`

### Third-Party Integrations
- **Sanity** - Headless CMS with visual editing
- **Shopify** - E-commerce with cart functionality
- **HubSpot** - Forms and marketing automation

## Modular Integrations

This template includes optional integrations that can be easily removed if not needed for your project:

### Removing an Integration
1. Delete the integration directory from `integrations/` (e.g., `integrations/shopify/`)
2. Remove the corresponding page directory from `app/(pages)/` (e.g., `app/(pages)/shopify/`)
3. Remove any related imports or references in other files
4. Update documentation and environment variables as needed

This keeps the template lightweight and customized to your needs.

## Sanity Integration Setup

### Overview
Sanity is integrated as a headless CMS with support for visual editing in the Next.js App Router. It uses React Server Components for server-side data fetching and client-side visual editing overlays.

### Configuration
- **Dependencies**: Managed via `next-sanity`, `@sanity/presentation`, `@sanity/visual-editing`.
- **Studio**: Mounted at `/studio` using `NextStudio`.
- **Visual Editing**: Enabled via `presentationTool` in `sanity.config.ts` with draft mode routes `/api/draft` and `/api/disable-draft`.
- **Client**: Configured in `integrations/sanity/client.ts` with stega for visual editing.
- **Queries**: Server-side fetches in page components check `draftMode()` to fetch draft content with `previewDrafts` perspective.
- **RSC Compatibility**: Data fetching occurs on the server, with `<VisualEditing />` component used client-side in layout.

### Environment Variables
Set these in `.env.local` (based on `.env.example`):
```
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
SANITY_API_WRITE_TOKEN="your-write-token"
```

### Visual Editing Features
- **Real-time editing**: Changes in Studio sidebar reflect instantly in preview
- **Draft mode**: Toggle between published and draft content
- **Disable draft mode**: UI component to exit draft mode when not in Studio
- **Proper targeting**: Components use `data-sanity` attributes for editing overlay

### Future Enhancement: Live Content API
For production applications, consider implementing Sanity's Live Content API with `defineLive`, `sanityFetch`, and `SanityLive` components for optimal real-time performance and cache management.

### Replication for New Projects
1. Create a new Sanity project at sanity.io.
2. Update env vars with your project ID and dataset.
3. Configure schemas in `sanity/schemaTypes/`.
4. Set up webhooks for revalidation at `/api/revalidate`.
5. To enable visual editing:
   - Install Sanity Presentation tool.
   - Ensure draft mode is configured.
   - Add `data-sanity` attributes to editable elements.
6. Test by enabling draft mode and using the visual editor.

For detailed guidelines, refer to [Sanity Integration Guide](integrations/sanity/README.md).

## 🎨 Styling System

### CSS Modules
Components use CSS modules with the `s` import convention:

```tsx
import s from './component.module.css'

function Component() {
  return <div className={s.wrapper} />
}
```

### Responsive Design
Custom viewport functions for responsive sizing:

```css
.element {
  width: mobile-vw(150);    /* 150px at mobile viewport */
  height: desktop-vh(100);  /* 100px at desktop viewport */
}
```

### Theme Variables
CSS variables for consistent theming:

```css
.element {
  color: var(--color-text);
  background-color: var(--color-background);
}
```

## 🔧 Development Tools

### Debug Panel (CMD+O)
- **Theatre.js Studio** - Visual animation editor
- **FPS Meter** - Performance monitoring
- **Grid Overlay** - Layout debugging
- **Minimap** - Page overview

### Available Scripts

```bash
# Development
bun dev              # Start dev server with Turbopack

# Building
bun build            # Production build
bun analyze          # Bundle analysis

# Code Quality
bun lint             # Run Biome linter
bun typecheck        # TypeScript checking

# Styling
bun setup:styles     # Generate style files
bun watch:styles     # Watch style changes
```

## 🌐 Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID="your-project-id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_STUDIO_URL="http://localhost:3000/studio"
SANITY_API_WRITE_TOKEN="your-write-token"

# Shopify
SHOPIFY_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_TOKEN="your-storefront-token"

# HubSpot
HUBSPOT_ACCESS_TOKEN="your-access-token"
```

## 📚 Documentation

- [Sanity CMS Integration Guide](integrations/sanity/README.md) - Complete guide for visual editing, content management, and development
- [Component Guidelines](/.cursor/rules/components.mdc)
- [Styling Guidelines](/.cursor/rules/styling.mdc)
- [WebGL Development](/.cursor/rules/webgl.mdc)
- [Integration Guide](/.cursor/rules/integrations.mdc)
- [Tailwind CSS v4 Reference](/.cursor/rules/tailwind-css-v4.mdc)

## Deployment

### Vercel (Recommended)
```bash
vercel
```

### Production Checks
1. Environment variables are set in Vercel
2. Sanity webhooks are configured
3. GSAP license is valid (if using premium features)
4. SSL certificates are valid
5. Performance metrics are within acceptable ranges

### Monitoring
- Vercel Analytics Dashboard
- Lighthouse CI Reports
- Performance monitoring with hooks/use-performance.ts

### Content Updates
1. Content changes through Sanity will automatically update via webhooks
2. For code changes, follow the standard Vercel deployment flow
3. Clear cache if needed: `https://your-domain.com/api/revalidate`

## Support & Maintenance

### Common Issues
1. **Sanity Visual Editor Not Working**
   - Check environment variables
   - Verify draft mode configuration
   - Ensure presentation tool is properly configured

2. **Style Updates Not Reflecting**
   - Run `bun setup:styles`
   - Clear browser cache
   - Check deployment status

3. **Performance Issues**
   - Check Theatre.js sequences
   - Verify GSAP animations
   - Monitor WebGL performance

### Other Platforms
The project supports deployment to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Self-hosted with Node.js

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/fix-everything`)
3. Commit your changes (`git commit -m 'Add fix everything feature'`)
4. Push to the branch (`git push origin feature/fix-everything`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built by [darkroom.engineering](https://darkroom.engineering)
- Inspired by modern web development best practices
- Community contributions and feedback
