# Architecture Guide

*For teams inheriting this codebase after a Satūs handoff*

## What This Codebase Provides

This codebase was built with [Satūs](https://github.com/darkroomengineering/satus), a modern Next.js starter that includes battle-tested patterns and integrations. Here's what you get:

### Core Framework
- **Next.js 16** with App Router, Turbopack, and Cache Components
- **React 19.2** with `<Activity />`, `useEffectEvent`, and `cacheSignal`
- **React Compiler** - automatic optimization (no manual memoization needed)
- **TypeScript** with strict mode
- **Biome** for fast linting and formatting

### Performance Optimizations
- **Turbopack** for lightning-fast HMR in development
- **React Server Components** by default
- **Image optimization** with custom wrapper around Next.js Image
- **Font optimization** with Next.js Font loading
- **Cache Components** for advanced caching strategies

### Styling System
- **Tailwind CSS v4** with CSS-first configuration
- **CSS Modules** for component-specific styles
- **Responsive utilities** (`mobile-vw()`, `desktop-vw()`)
- **Custom PostCSS functions** for pixel-perfect scaling

### Third-Party Integrations
This codebase includes optional integrations that may or may not be active:

- **Sanity CMS** - Headless CMS with visual editing
- **Shopify** - E-commerce platform
- **HubSpot** - Marketing forms and CRM
- **Mailchimp** - Email marketing
- **Mandrill** - Transactional emails

### Development Tools
- **Orchestra** - Debug tools (CMD+O) - includes Theatre.js, Stats, Grid overlay
- **WebGL / Three.js** - 3D graphics with React Three Fiber
- **GSAP** - Timeline-based animations
- **Lenis** - Smooth scrolling

---

## Key Architectural Decisions

### Why CSS Modules + Tailwind?

This codebase uses **both** CSS Modules and Tailwind CSS, which might seem redundant at first. Here's why:

- **Tailwind** for rapid prototyping and consistent design tokens
- **CSS Modules** for complex component-specific styles and animations
- **PostCSS functions** for responsive scaling (`mobile-vw()`, `desktop-vw()`)

**When to use what:**
- Use Tailwind utilities for 80% of styling (spacing, colors, typography)
- Use CSS Modules for complex animations, custom layouts, or when you need CSS specificity

### Why Custom Image/Link Components?

All images and links use custom components instead of native HTML elements:

```tsx
// Always use these, never <img> or <a> directly
import { Image } from '~/components/ui/image'
import { Link } from '~/components/ui/link'
```

**Why?**
- **Image**: Automatic optimization, aspect ratios, WebGL integration
- **Link**: Smart external link detection, prefetching, consistent behavior

### Why Lenis for Scrolling?

Lenis provides smooth scrolling with GSAP integration:

```tsx
// Already configured in app/layout.tsx
// ScrollTrigger automatically uses Lenis
```

**Benefits:**
- Better performance than native smooth scrolling
- GSAP ScrollTrigger integration
- Consistent cross-browser behavior

### Why Zustand for State Management?

```tsx
import { useStore } from '~/hooks'

const { user, cart, theme } = useStore()
```

**Why not Redux/Context?**
- Lightweight (3KB gzipped)
- No boilerplate
- TypeScript-first
- React concurrent mode compatible

### Why Optional Features in Root Layout?

The root layout conditionally loads features based on configuration:

```tsx
// app/layout.tsx
import { OptionalFeatures } from '~/lib/features'

// Only loads WebGL, dev tools, etc. when needed
<OptionalFeatures />
```

**Benefits:**
- Faster initial page loads
- Smaller production bundles
- No unused code in production

---

## File Organization Philosophy

```
Mental model: "If it renders UI, it's in components/. Everything else is in lib/."
```

### Components Structure
```
components/
├── ui/        → Primitives (reusable across projects)
├── layout/    → Site chrome (customize per project)
└── effects/   → Animations & visual enhancements
```

### Lib Structure
```
lib/
├── hooks/     → Custom React hooks + Zustand store
├── styles/    → CSS & Tailwind configuration
├── utils/     → Pure utility functions
├── integrations/ → Third-party services (optional)
├── webgl/     → 3D graphics (optional)
└── dev/       → Debug tools (optional)
```

---

## Performance Patterns

### React Compiler
Enabled automatically. **Do not** use manual `useMemo`, `useCallback`, or `React.memo`:

```tsx
// ❌ Don't do this
const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b])

// ✅ Compiler handles optimization automatically
const value = computeExpensive(a, b)
```

**Exception:** Use `useRef` for object instantiation to prevent infinite loops.

### Cache Components (Next.js 16)
Server Components use advanced caching:

```tsx
// ✅ Automatic ISR with revalidation
export const revalidate = 3600

// ❌ Never cache user-specific data
export async function fetchUserData(id: string) {
  const res = await fetch(`/api/users/${id}`, {
    cache: 'no-store' // Required for user data
  })
  return res.json()
}
```

### WebGL Optimization
Uses lazy GlobalCanvas with visibility-based pausing:

```tsx
// Only mounts when first WebGL page is visited
// Automatically pauses when not visible
<Wrapper webgl>
  <WebGLTunnel>
    <My3DScene />
  </WebGLTunnel>
</Wrapper>
```

---

## Development Workflow

### Scripts
```bash
bun dev        # Development with Turbopack
bun build      # Production build
bun lint       # Biome linting
bun typecheck  # TypeScript validation
```

### Debug Tools
- Press `CMD+O` for Orchestra debug panel
- Includes Theatre.js for animation debugging
- FPS monitor and layout grid overlay

### Environment Variables
Check `.env.example` for required variables. The codebase automatically detects which integrations are configured.

---

## Common Gotchas

### 1. Cache Components & User Data
**Never cache personalized data** (user profiles, carts, private content). Always use `cache: 'no-store'`.

### 2. WebGL Context Loss
Don't create multiple Canvas components. Use the GlobalCanvas pattern.

### 3. Image Optimization
Always use `<Image />` component, never `<img>` or `next/image` directly.

### 4. Link Behavior
Use `<Link />` component for consistent prefetching and external link handling.

### 5. Styling Conflicts
Tailwind classes take precedence over CSS Modules. Use CSS Modules for complex component styles.

---

## Extending the Codebase

### Adding New Components
```bash
# Generate new component
bun run generate

# Or create manually in components/ui/
```

### Adding Integrations
1. Add to `lib/integrations/` directory
2. Update `lib/scripts/integration-bundles.ts`
3. Add to setup script if removable
4. Update environment variables

### Modifying Styling
1. Edit config in `lib/styles/` (colors, typography, etc.)
2. Run `bun setup:styles` to regenerate CSS
3. Update Tailwind config if needed

---

## Deployment

### Vercel (Recommended)
Push to `main` branch. Includes Lighthouse CI for performance monitoring.

### Other Platforms
Works with any Next.js-compatible platform. May need to adjust build commands.

### Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] Integrations tested
- [ ] Build passes without errors
- [ ] Performance score > 90
- [ ] SEO metadata configured

---

## Support

This codebase was built by [darkroom.engineering](https://darkroom.engineering). For questions about the Satūs starter:

- Check the [Satūs documentation](https://github.com/darkroomengineering/satus)
- Review inline code comments
- Check `lib/README.md` for utility references

---

*Built with ❤️ using Satūs - A modern Next.js starter for ambitious projects.*