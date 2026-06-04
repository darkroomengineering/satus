# Effect Components

> **Reveal-on-scroll and entrance animations** use the `useReveal` hook + the `[data-reveal]` CSS contract — not this directory. See `lib/hooks` and AGENTS.md § Animation.

This directory is for GSAP-based effects: the runtime ticker bridge and orchestrated/scroll effects.

## Components

| Component | Purpose |
|-----------|---------|
| `gsap.tsx` | `GSAPRuntime` — syncs GSAP's ticker to Tempus (single RAF loop) |
| `progress-text/` | Scroll-driven progress text effect (GSAP-based) |

## GSAPRuntime

Mount once in the root layout via `OptionalFeatures`. Ensures GSAP animations run on the Tempus RAF loop. ScrollTrigger↔Lenis sync is handled by the Lenis component.

```tsx
// Already loaded via OptionalFeatures — do not import manually
```

## Progress Text

Reveal text based on scroll progress.

```tsx
import { ProgressText } from '@/components/effects/progress-text'

<ProgressText>
  This text reveals as you scroll through the section
</ProgressText>
```

## Dependencies

- **GSAP** — animation library (`gsap`)
- **Tempus** — RAF management (`tempus`)
