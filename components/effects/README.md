# Effect Components

Animation and visual effect components built with GSAP.

## Components

| Component | Purpose |
|-----------|---------|
| `gsap.tsx` | GSAP Runtime - syncs GSAP ticker with Tempus RAF |
| `animated-gradient/` | WebGL animated gradient background |
| `split-text/` | Text splitting for character/word/line animations |
| `progress-text/` | Scroll-based text reveal animation |

## GSAP Runtime

Automatically included via `OptionalFeatures` in the root layout. Ensures GSAP animations sync with Tempus for consistent frame timing across all animations.

```tsx
// Already loaded - no manual import needed
// GSAP will use Tempus RAF automatically
```

## Split Text

Split text into characters, words, or lines for staggered animations.

```tsx
import { SplitText } from '@/components/effects/split-text'

<SplitText type="chars" className="text-4xl">
  Animate each character
</SplitText>

<SplitText type="words" className="text-2xl">
  Animate each word separately
</SplitText>

<SplitText type="lines" className="text-xl">
  Animate line by line
  for multiline text
</SplitText>
```

## Animated Gradient

WebGL-based animated gradient background. Requires WebGL to be enabled.

```tsx
import { AnimatedGradient } from '@/components/effects/animated-gradient'

<AnimatedGradient
  colors={['#ff0000', '#00ff00', '#0000ff']}
  speed={0.5}
/>
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

- **GSAP** - Animation library (gsap)
- **Tempus** - RAF management (tempus)
- **SplitText Plugin** - GSAP plugin for text splitting
