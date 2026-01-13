# Utils

Pure utility functions organized by concern.

Use explicit imports for clarity and better tree-shaking:

```tsx
import { clamp, lerp } from '@/utils/math'
import { slugify } from '@/utils/strings'
import { fetchWithTimeout } from '@/utils/fetch'
import { generateSanityMetadata } from '@/utils/metadata'
```

## Modules

| Module | Functions |
|--------|-----------|
| `math` | `clamp`, `lerp`, `mapRange`, `modulo`, `normalize`, `distance` |
| `easings` | All easing functions (`easeOutCubic`, etc.) |
| `animation` | `fromTo`, `stagger`, `ease`, `spring` |
| `raf` | `measure`, `mutate`, `batch` (DOM batching) |
| `viewport` | `desktopVW`, `mobileVW` |
| `fetch` | `fetchWithTimeout`, `fetchJSON` |
| `strings` | `slugify`, `mergeRefs`, `capitalizeFirstLetter` |
| `metadata` | `generatePageMetadata`, `generateSanityMetadata` |
| `performance` | `reportWebVitals`, `getLCP`, `getCLS` |

## Common Patterns

```tsx
// Math
clamp(0, value, 100)
lerp(0, 100, 0.5) // → 50
mapRange(0, 1000, scrollY, 0, 1)

// Animation
fromTo(elements, { opacity: 0 }, { opacity: 1 }, progress)
const curved = ease(0.5, 'easeOutCubic')

// DOM batching (prevents layout thrashing)
await measure(() => element.getBoundingClientRect())
await mutate(() => element.style.transform = 'translateX(10px)')

// Fetch with timeout
const response = await fetchWithTimeout(url, { timeout: 5000 })

// SEO
export const metadata = generatePageMetadata({ title: 'About' })
```
