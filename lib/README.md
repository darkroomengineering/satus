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
├── utils/           # Consolidated utilities (see ~/utils/README.md)
│   ├── math.ts      # Pure math: clamp, lerp, mapRange
│   ├── easings.ts   # Easing curves
│   ├── animation.ts # High-level animation helpers
│   ├── raf.ts       # DOM batching: measure, mutate
│   ├── viewport.ts  # Responsive scaling
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

Organized by concern. See [~/utils/README.md](./utils/README.md) for full docs.

```tsx
// Barrel import (quick)
import { clamp, lerp, slugify, fetchWithTimeout } from '~/utils'

// Module imports (recommended for clarity)
import { clamp, lerp, mapRange } from '~/utils/math'
import { easings, type EasingName } from '~/utils/easings'
import { fromTo, stagger } from '~/utils/animation'
import { measure, mutate } from '~/utils/raf'
import { desktopVW, mobileVW } from '~/utils/viewport'
```

### Math (`~/utils/math`) — Pure mathematical functions

| Function | Purpose |
|----------|---------|
| `clamp(min, value, max)` | Constrain value to range |
| `mapRange(inMin, inMax, value, outMin, outMax)` | Scale between ranges |
| `lerp(start, end, t)` | Linear interpolation |
| `modulo(n, d)` | True modulo (negative-safe) |
| `normalize(min, max, value)` | Normalize to 0–1 |
| `distance(x1, y1, x2, y2)` | 2D distance |
| `degToRad(deg)` / `radToDeg(rad)` | Angle conversion |

### Easings (`~/utils/easings`) — Animation curves

| Export | Purpose |
|--------|---------|
| `easings` | All easing functions (easeOutCubic, etc.) |
| `EasingName` | Type for easing names |

### Animation (`~/utils/animation`) — High-level helpers

| Function | Purpose |
|----------|---------|
| `fromTo(elements, from, to, progress, options)` | Animate multiple elements |
| `stagger(index, total, progress, staggerAmount)` | Staggered timing |
| `ease(progress, easeName)` | Apply easing function |
| `spring(current, target, velocity, ...)` | Spring physics |

### RAF (`~/utils/raf`) — DOM batching

| Function | Purpose |
|----------|---------|
| `measure(fn)` | Queue DOM read |
| `mutate(fn)` | Queue DOM write |
| `batch(reads, write)` | Batch multiple operations |

### Viewport (`~/utils/viewport`) — Responsive scaling

| Function | Purpose |
|----------|---------|
| `desktopVW(px, width)` | Scale to desktop design |
| `mobileVW(px, width)` | Scale to mobile design |

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
| Math operations | `~/utils/math` → `clamp`, `lerp`, etc. |
| JS easing functions | `~/utils/easings` → `easings` |
| CSS easing strings | `~/styles` → `easings` |
| Animation helpers | `~/utils/animation` → `fromTo`, `stagger` |
| DOM read/write batching | `~/utils/raf` → `measure`, `mutate` |
| Responsive JS scaling | `~/utils/viewport` → `desktopVW`, `mobileVW` |
| Fetch with timeout | `~/utils/fetch` → `fetchWithTimeout` |

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
bun run generate     # Generate new pages/components
bun run setup:project  # Configure integrations
bun run handoff      # Prepare for client delivery
```
