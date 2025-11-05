[![SATUS](https://assets.darkroom.engineering/satus/banner.gif)](https://github.com/darkroomengineering/satus)

# Satūs

A modern, high-performance React application starter with Next.js 15, React 19, Tailwind CSS v4, and advanced WebGL capabilities. Satūs means "start" or "beginning" in Latin, serving as a foundation for new projects.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/darkroomengineering/satus)

> **Note**: This README is for developers working on the Satūs template. For client/team handoff documentation, see [PROD-README.md](PROD-README.md) (replace this README in production projects).

## Quick Start

```bash
# Install dependencies
bun install

# Create .env.local (see Environment Variables below)
# touch .env.local

# Start development server with Turbopack
bun dev

# Build for production
bun build

# Start production server
bun start
```

## 🛠 Tech Stack

- **[Next.js 16.0.1](https://nextjs.org)** - React framework with App Router, Turbopack, and Cache Components
- **[React 19.2.0](https://react.dev)** - Latest React with `<Activity />`, `useEffectEvent`, and `cacheSignal`
- **[React Compiler](https://react.dev/reference/react/compiler)** - Automatic optimization enabled
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[Tailwind CSS 4.1.16](https://tailwindcss.com)** - CSS-first configuration
- **[React Three Fiber](https://docs.pmnd.rs/react-three-fiber)** - React renderer for Three.js
- **[GSAP](https://greensock.com/gsap/)** - Timeline-based animations
- **[Biome 2.3.3](https://biomejs.dev)** - Fast formatter and linter
- **[Bun](https://bun.sh)** - All-in-one JavaScript runtime

## ⚛️ React 19.2 Features

### `<Activity />` Component
Manages off-screen component visibility and defers updates for better performance:

```tsx
import { Activity } from 'react'

<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <ExpensiveComponent />
</Activity>
```

**Use Cases:** Tab systems, accordions, off-screen WebGL scenes

### `useEffectEvent` Hook
Separates event logic from effect dependencies to prevent unnecessary re-runs:

```tsx
import { useEffect, useEffectEvent } from 'react'

const onConnected = useEffectEvent(() => {
  showNotification('Connected!', theme) // Theme changes won't trigger reconnect
})

useEffect(() => {
  // Only reconnect when url changes
}, [url])
```

### `cacheSignal` (Server Components)
Provides automatic request cleanup when cache scope expires:

```tsx
import { cacheSignal } from 'react'

async function fetchUserData(id: string) {
  const signal = cacheSignal() // Auto-aborts on cache expiry
  const response = await fetch(`/api/users/${id}`, { signal })
  return response.json()
}
```

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
- **React Compiler** automatically optimizes re-renders and memoization (see [React Compiler section](#react-compiler))
- **Next.js 16 Cache Components** for advanced caching strategies
- **React 19.2 `<Activity />`** for off-screen component optimization
- **Dynamic imports** for code splitting
- **Image optimization** with a custom thin wrapper around Next.js Image
- **Font optimization** with Next.js Font

### Modern Styling
- **Tailwind CSS 4.1.16** with CSS-first configuration
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
- **Biome 2.3.3** for consistent code style
- **React Compiler** - automatic optimization (no manual memoization needed)
- **Hot Module Replacement** with Turbopack
- **React 19.2 Performance Tracks** in Chrome DevTools
- **Git hooks** with Lefthook
- **Debug tools** accessible with `CMD+O`

### Third-Party Integrations
- **Sanity** - Headless CMS with visual editing
- **Shopify** - E-commerce with cart functionality
- **HubSpot** - Forms and marketing automation

## Managing Integrations

Check which integrations are configured:

```bash
bun validate:env              # Check environment setup
bun cleanup:integrations      # List unused integrations
```

Remove unused integrations to reduce bundle size (~250-400KB potential savings). See [Integrations Documentation](integrations/README.md) for detailed removal instructions.


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
bun dev                     # Start dev server with Turbopack
bun build                   # Production build
bun start                   # Start production server

# Code Quality
bun lint                    # Run Biome linter
bun lint:fix                # Fix linting issues
bun typecheck               # TypeScript validation

# Utilities
bun setup:styles            # Generate style files
bun validate:env            # Check environment variables
bun cleanup:integrations    # List unused integrations
bun analyze                 # Bundle analysis
```

## 🌐 Environment Variables

Create a `.env.local` file with your required variables. See [integrations/README.md](integrations/README.md#environment-variables) for the complete list of all available environment variables.

## 📚 Documentation

- [App](app/README.md) - Next.js structure and routing
- [Integrations](integrations/README.md) - Third-party integrations
- [Components](components/README.md) - UI components
- [Hooks](hooks/README.md) - Custom React hooks
- [Libs](libs/README.md) - Utility libraries
- [Styles](styles/README.md) - Styling system
  - [Scripts](styles/scripts/README.md) - Style generation
- [WebGL](webgl/README.md) - 3D graphics
- [Orchestra](orchestra/README.md) - Debug tools

## Deployment

Deploy to Vercel (recommended):

```bash
vercel
```

### Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] Sanity webhooks set up
- [ ] GSAP license valid (if using premium)
- [ ] SSL certificates configured
- [ ] Performance metrics validated

### Other Platforms
Supports any Next.js-compatible platform: Vercel, Netlify, AWS Amplify, Google Cloud Run, or self-hosted.

## Important Notes

**Images & Links**
- ✅ Always use `~/components/link` (auto-detects external, smart prefetch)
- ✅ Always use `~/components/image` for DOM (never `next/image` directly)
- ✅ Use `~/webgl/components/image` in WebGL contexts
- See [Image Component documentation](components/image/README.md) for details

**GSAP & Animation**
- Add `<GSAPRuntime />` in `app/layout.tsx` for ScrollTrigger + Lenis
- No manual ticker setup needed
- See [GSAP documentation](components/gsap/README.md) for setup details

**React Compiler** {#react-compiler}
- Enabled automatically in `next.config.ts` (`reactCompiler: true`)
- No need for manual `useMemo`, `useCallback`, or `React.memo` - compiler handles optimization automatically
- Exception: Use `useRef` for object instantiation to prevent infinite loops

**Sanity**
- Requires draft mode routes: `/api/draft-mode/enable` and `/api/draft-mode/disable`
- Must set `NEXT_PUBLIC_BASE_URL` for preview resolution

**Orchestra**
- Toggle debug tools with `Cmd/Ctrl + O`
- State persists in `localStorage` and syncs across tabs
- Automatically excluded from production builds

**Shopify**
- Use exact env var names: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`

**Next.js 16 Features**
- Cache Components enabled (`cacheComponents: true`)
- Typed routes enabled for better TypeScript support
- Advanced caching strategies available

**⚠️ Cache Components Gotchas:** {#cache-components-gotchas}
- **Server Components Only**: Cache Components work only in Server Components, not Client Components
- **Suspense Boundaries Required**: Cached components must be wrapped in Suspense boundaries
- **User-Specific Data**: Never cache personalized/user-specific data (risk of data leakage between users)
- **Real-Time Data**: Opt out of caching for live data (stock prices, live feeds) using `cache: 'no-store'`
- **Development vs Production**: Caching behavior differs - test in both environments
- **Router Cache vs Data Cache**: Next.js has multiple caching layers - test with hard refresh and navigation
- **"use cache" Directive**: Use `'use cache'` directive explicitly when you need component-level caching
- **Dynamic Routes**: Cache invalidation works differently for dynamic routes - use `revalidateTag` or `revalidatePath`

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
