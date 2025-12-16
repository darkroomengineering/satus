# Lib

Non-UI code: hooks, integrations, styles, and utilities.

> **Where does X go?**
> - Renders UI → `components/`
> - Everything else → `lib/`

---

## Quick Import Reference

| Need | Import |
|------|--------|
| Custom hook | `import { useScrollTrigger } from '~/hooks'` |
| Global state | `import { useStore } from '~/hooks'` |
| Styles/config | `import { colors, themes } from '~/styles'` |
| WebGL | `import { Canvas, WebGLTunnel } from '~/webgl'` |
| Integration | `import { sanityFetch } from '~/integrations/sanity'` |
| Utility | `import { clamp, lerp, slugify } from '~/utils'` |
| Metadata/SEO | `import { generatePageMetadata } from '~/utils'` |
| Dev tools | `import { useOrchestra } from '~/dev'` |

---

## Structure

```
lib/
├── hooks/           # Custom React hooks + Zustand store
├── styles/          # CSS & Tailwind system  
├── utils/           # Consolidated utilities
│   ├── animation.ts # Math, easings, RAF queue
│   ├── strings.ts   # String/object helpers
│   ├── metadata.ts  # SEO helpers
│   ├── performance.ts # Core Web Vitals
│   ├── fetch.ts     # Timeout-protected fetch
│   └── types.d.ts   # Type definitions
├── integrations/    # Third-party services (optional)
├── webgl/           # 3D graphics (optional)
├── dev/             # Debug tools (optional)
└── scripts/         # CLI tools
```

| Directory | Optional? | Delete if... |
|-----------|-----------|--------------|
| `hooks/` | ❌ Core | — |
| `styles/` | ❌ Core | — |
| `utils/` | ❌ Core | — |
| `integrations/` | ✅ Yes | Not using any CMS/CRM |
| `webgl/` | ✅ Yes | DOM-only project |
| `dev/` | ✅ Yes | Don't need debug tools |

---

## Hooks

```tsx
// Barrel import (recommended)
import { useScrollTrigger, useTransform, useDeviceDetection, useStore } from '~/hooks'

// Individual import (also works)
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'
```

| Hook | Purpose |
|------|---------|
| `useDeviceDetection` | Detect mobile/desktop/tablet |
| `usePrefetch` | Prefetch routes on hover |
| `useScrollTrigger` | Scroll-based animations |
| `useTransform` | Element transformations |
| `useStore` | Global Zustand store |

---

## Styles

```tsx
// Barrel import
import { colors, themes, breakpoints, fontsVariable } from '~/styles'

// Individual imports
import { colors, themes } from '~/styles/colors'
import { breakpoints, screens } from '~/styles/config'
```

| Export | Purpose |
|--------|---------|
| `colors` | Color palette |
| `themes` | Theme definitions (light/dark/red) |
| `breakpoints` | Responsive breakpoints |
| `fontsVariable` | Font CSS variables |
| `typography` | Type scale |
| `easings` | CSS easing functions |

---

## Utilities

```tsx
// Import everything from barrel
import { 
  clamp, mapRange, lerp, slugify, mergeRefs,
  fetchWithTimeout, generatePageMetadata, easings 
} from '~/utils'

// Or import specific modules
import { easings } from '~/utils/animation'
import { generateSanityMetadata } from '~/utils/metadata'
```

### Animation & Math (`~/utils/animation`)

| Function | Purpose |
|----------|---------|
| `clamp(min, value, max)` | Limit value to range |
| `mapRange(inMin, inMax, value, outMin, outMax)` | Scale between ranges |
| `lerp(start, end, t)` | Linear interpolation |
| `modulo(n, d)` | Negative-safe modulo |
| `stagger(index, total, progress, staggerAmount)` | Staggered animation timing |
| `ease(progress, easeName)` | Apply easing function |
| `fromTo(elements, from, to, progress, options)` | Animate multiple elements |
| `easings` | All easing functions (easeOutExpo, etc.) |
| `measure(fn)` | Queue DOM read (prevents thrashing) |
| `mutate(fn)` | Queue DOM write (prevents thrashing) |

### Strings & Objects (`~/utils/strings`)

| Function | Purpose |
|----------|---------|
| `slugify(text)` | URL-friendly strings |
| `capitalizeFirstLetter(str)` | Capitalize first letter |
| `twoDigits(number)` | Pad to 2 digits (01, 02...) |
| `isEmptyObject(obj)` | Check if object is empty |
| `isEmptyArray(arr)` | Check if array is empty |
| `mergeRefs(...refs)` | Combine multiple refs |

### Metadata/SEO (`~/utils/metadata`)

| Function | Purpose |
|----------|---------|
| `generatePageMetadata(options)` | Generate full metadata object |
| `generateSanityMetadata(options)` | Metadata for Sanity CMS pages |

### Fetch (`~/utils/fetch`)

| Function | Purpose |
|----------|---------|
| `fetchWithTimeout(url, options)` | Fetch with timeout protection |
| `fetchJSON<T>(url, options)` | Fetch + parse JSON |

### Performance (`~/utils/performance`)

| Function | Purpose |
|----------|---------|
| `getCLS`, `getFID`, `getFCP`, `getLCP`, `getTTFB` | Individual vitals |
| `reportWebVitals(onReport)` | Report all vitals |

---

## WebGL

```tsx
// Barrel import
import { Canvas, WebGLTunnel, useCanvas } from '~/webgl'

// Individual imports
import { Canvas } from '~/webgl/components/canvas'
import { Flowmap } from '~/webgl/utils/flowmaps'
```

| Export | Purpose |
|--------|---------|
| `Canvas` | R3F canvas wrapper |
| `WebGLTunnel` / `DOMTunnel` | Portal between DOM and WebGL |
| `FlowmapProvider` | Mouse flowmap effects |
| `WebGLImage` | GPU-accelerated images |
| `useWebGLRect` | Element rect for WebGL |

---

## Integrations

```tsx
// Sanity CMS
import { sanityFetch, RichText } from '~/integrations/sanity'

// Shopify
import { Cart, AddToCart } from '~/integrations/shopify/cart'

// HubSpot
import { EmbedHubspotForm } from '~/integrations/hubspot/embed'

// Cleanup utility
import { printCleanupInstructions } from '~/integrations/cleanup'
```

See [Integrations README](./integrations/README.md) for full docs.

---

## When to Use What

| Need | Use |
|------|-----|
| Element size/position | `hamo` → `useRect` |
| Window dimensions | `hamo` → `useWindowSize` |
| Scroll position | `lenis` → `useLenis` |
| Frame loop | `tempus` → `useTempus` |
| Math operations | `~/utils` → `clamp`, `lerp`, etc. |
| JS easing functions | `~/utils` → `easings` |
| CSS easing strings | `~/styles` → `easings` |
| DOM read/write batching | `~/utils` → `measure`, `mutate` |
| Fetch with timeout | `~/utils` → `fetchWithTimeout` |

---

## Dev Tools

```tsx
import { useOrchestra, OrchestraTools } from '~/dev'
import { TheatreProjectProvider } from '~/dev/theatre'
```

Toggle with `Cmd/Ctrl + O`. Auto-excluded from production.

---

## CLI Scripts

```bash
bun dev              # Start dev server
bun build            # Production build
bun lint             # Run linter
bun typecheck        # Type check
bun cleanup:integrations  # Find unused integrations
```
