# Effect Components

> **Reveal-on-scroll and entrance animations** use the `useReveal` hook + the `[data-reveal]` CSS contract — not this directory. See `lib/hooks` and AGENTS.md § Animation.

This directory is for GSAP-based effects: the runtime ticker bridge and orchestrated/scroll effects.

## Components

| Component        | Purpose                                                         |
| ---------------- | --------------------------------------------------------------- |
| `gsap.tsx`       | `GSAPRuntime` — syncs GSAP's ticker to Tempus (single RAF loop) |
| `progress-text/` | Scroll-driven text reveal (SplitText + ScrollTrigger, scrubbed) |

## GSAPRuntime

Mounted by the layout through `<OptionalFeatures gsap />` (off by default; see `lib/features/README.md`) — do not import it in pages. Ensures GSAP animations run on the Tempus RAF loop. ScrollTrigger↔Lenis sync is handled by the Lenis component.

## Progress Text

Words fade in as scroll progress advances, split by GSAP's SplitText and
scrubbed 1:1 through a ScrollTrigger (which syncs to Lenis via the bridge in
`components/layout/lenis`). Content is static after mount — remount with a
`key` to change it. `prefers-reduced-motion` gets a single gentle fade
instead of scroll linkage.

```tsx
import { ProgressText } from '@/components/effects/progress-text'

;<ProgressText start="top bottom" end="bottom bottom" dimOpacity={0.33}>
  This text reveals as you scroll through the section
</ProgressText>
```

## Dependencies

- **GSAP** — animation library (`gsap`)
- **Tempus** — RAF management (`tempus`)
