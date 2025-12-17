# Utils

Consolidated utilities organized by concern. Each module has a single responsibility.

## Quick Reference

| Need this? | Import from |
|------------|-------------|
| `clamp`, `lerp`, `mapRange` | `~/utils/math` |
| `easeOutCubic`, `easeInOutQuart` | `~/utils/easings` |
| `fromTo`, `stagger`, `spring` | `~/utils/animation` |
| `measure`, `mutate` | `~/utils/raf` |
| `desktopVW`, `mobileVW` | `~/utils/viewport` |
| `fetchWithTimeout` | `~/utils/fetch` |
| `slugify`, `mergeRefs` | `~/utils/strings` |
| `generatePageMetadata` | `~/utils/metadata` |
| `reportWebVitals` | `~/utils/performance` |

## Modules

### `math.ts` — Pure Math

No side effects. Building blocks for everything else.

```ts
import { clamp, lerp, mapRange, modulo, truncate } from '~/utils/math'

clamp(0, value, 100)           // Constrain between bounds
lerp(0, 100, 0.5)              // Linear interpolation → 50
mapRange(0, 1000, scrollY, 0, 1) // Map scroll to opacity
modulo(-1, 3)                  // True modulo → 2 (not -1)
truncate(3.14159, 2)           // → 3.14
```

Also: `normalize`, `distance`, `degToRad`, `radToDeg`, `roundTo`

---

### `easings.ts` — Easing Curves

All standard easing functions. Input/output: 0–1.

```ts
import { easings, type EasingName } from '~/utils/easings'

const eased = easings.easeOutCubic(0.5) // ~0.875

// Dynamic easing selection
const name: EasingName = 'easeInOutQuart'
const value = easings[name](progress)
```

**Categories:**
- `easeOut*` — UI feedback, appearing elements (most common)
- `easeIn*` — Exiting, building tension
- `easeInOut*` — State transitions
- `*Cubic/*Quart` — Natural, balanced
- `*Expo` — Dramatic, snappy
- `*Elastic/*Bounce` — Playful

---

### `animation.ts` — Animation Helpers

High-level animation utilities. Combines math + easings.

```ts
import { fromTo, stagger, ease, spring } from '~/utils/animation'

// Animate elements with stagger
fromTo(elements, { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, progress, {
  ease: 'easeOutCubic',
  stagger: 0.1,
  render: (el, { opacity, y }) => {
    el.style.opacity = opacity
    el.style.transform = `translateY(${y}px)`
  }
})

// Calculate staggered progress for element in sequence
const elementProgress = stagger(index, total, progress, 0.1)

// Apply easing to linear progress
const curved = ease(0.5, 'easeOutCubic')

// Spring physics
const { value, velocity } = spring(current, target, velocity, 200, 20, deltaTime)
```

---

### `raf.ts` — DOM Batching

Prevents layout thrashing by batching reads and writes.

```ts
import { measure, mutate, batch } from '~/utils/raf'

// Read (measurement)
const rect = await measure(() => element.getBoundingClientRect())

// Write (mutation)
await mutate(() => {
  element.style.transform = `translateX(${rect.x}px)`
})

// Batch multiple reads then write
await batch(
  [() => el1.offsetWidth, () => el2.offsetHeight],
  ([width, height]) => {
    el3.style.width = `${width}px`
  }
)
```

**When to use:**
- Multiple DOM reads/writes in same frame
- Scroll/resize handlers that read then write
- Animation loops measuring layout

---

### `viewport.ts` — Responsive Scaling

Scale pixel values relative to design dimensions.

```ts
import { desktopVW, mobileVW } from '~/utils/viewport'

// For JavaScript (Canvas, WebGL, etc.)
const size = desktopVW(100, window.innerWidth)

// For CSS, use PostCSS functions instead:
// width: desktop-vw(100);
// height: mobile-vh(50);
```

Design dimensions: Desktop 1728×1024, Mobile 375×812

---

### `fetch.ts` — HTTP Utilities

Resilient HTTP requests with timeouts.

```ts
import { fetchWithTimeout, fetchJSON } from '~/utils/fetch'

// With timeout (default 10s)
const response = await fetchWithTimeout(url, { timeout: 5000 })

// JSON shorthand
const data = await fetchJSON<MyType>(url)
```

---

### `strings.ts` — String/Object Helpers

Common transformations and utilities.

```ts
import { slugify, mergeRefs, capitalizeFirstLetter } from '~/utils/strings'

slugify('Hello World')      // 'hello-world'
mergeRefs(ref1, ref2)       // Combine React refs
capitalizeFirstLetter('hi') // 'Hi'
```

Also: `isEmptyArray`, `isEmptyObject`, `numberWithCommas`, `twoDigits`

---

### `metadata.ts` — SEO

Generate consistent page metadata.

```ts
import { generatePageMetadata, generateSanityMetadata } from '~/utils/metadata'

// Generic metadata
export const metadata = generatePageMetadata({
  title: 'About',
  description: 'Learn more about us',
})

// From Sanity document
export const metadata = generateSanityMetadata(page, {
  title: page.seo?.title || page.title,
})
```

---

### `performance.ts` — Web Vitals

Monitor Core Web Vitals.

```ts
import { reportWebVitals, getLCP, getFID, getCLS } from '~/utils/performance'

// Report all vitals
reportWebVitals(console.log)

// Or individual metrics
getLCP((metric) => analytics.send(metric))
```

---

## Import Patterns

**Barrel import** (quick, but less clear):
```ts
import { clamp, lerp, slugify } from '~/utils'
```

**Module import** (recommended for clarity):
```ts
import { clamp, lerp } from '~/utils/math'
import { easings } from '~/utils/easings'
```

The barrel export maintains backward compatibility — existing imports won't break.

---

## For LLM Assistants

When helping with this codebase:

1. **Math operations** → Check `~/utils/math` first
2. **Animation/easing** → `~/utils/easings` for curves, `~/utils/animation` for helpers
3. **DOM performance** → `~/utils/raf` for batching reads/writes
4. **Responsive JS** → `~/utils/viewport` (CSS uses PostCSS functions)
5. **HTTP requests** → Always use `fetchWithTimeout` from `~/utils/fetch`

Each module is self-contained. Read only what you need.

