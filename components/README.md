# Components

**Single source of truth for all UI components.**

## Structure

```
components/
├── ui/        → Primitives (reusable across any project)
├── layout/    → Site chrome (customize per project)
└── effects/   → Animation & visual enhancements
```

## Quick Reference

| Category | Components | Import |
|----------|------------|--------|
| **UI** | image, link, form, select, dropdown, accordion, fold, scrollbar | `~/components/ui/[name]` |
| **Layout** | wrapper, navigation, footer, theme, lenis | `~/components/layout/[name]` |
| **Effects** | gsap, marquee, split-text, progress-text, animated-gradient | `~/components/effects/[name]` |

## Usage

```tsx
// Direct imports (recommended)
import { Image } from '~/components/ui/image'
import { Wrapper } from '~/components/layout/wrapper'
import { Marquee } from '~/components/effects/marquee'

// Category barrel imports
import { Image, Link, Form } from '~/components/ui'
import { Wrapper, Navigation, Footer } from '~/components/layout'
import { Marquee, GSAPRuntime } from '~/components/effects'
```

## UI Components

Reusable primitives that work in any project.

### Core

- **`image/`** - Optimized images (always use this, never `next/image` directly)
- **`link/`** - Smart navigation (auto-detects external links, prefetching)
- **`form/`** - Form components with validation and server actions
- **`select/`** - Custom select/dropdown

### Interactive

- **`accordion/`** - Expandable sections with Activity optimization
- **`dropdown/`** - Dropdown menus
- **`fold/`** - Folding animations
- **`scrollbar/`** - Custom scrollbars

### Utilities

- **`real-viewport/`** - Accurate viewport dimensions (CSS custom properties)
- **`scroll-restoration/`** - Preserve scroll position
- **`sanity-image/`** - Sanity CMS image wrapper

## Layout Components

Site structure components - customize these per project.

- **`wrapper/`** - Page wrapper with theme, WebGL canvas, and Lenis
- **`navigation/`** - Site navigation
- **`footer/`** - Site footer
- **`theme/`** - Theme provider and context
- **`lenis/`** - Smooth scrolling wrapper

```tsx
// Typical page structure
import { Wrapper } from '~/components/layout/wrapper'

export default function Page() {
  return (
    <Wrapper theme="dark" webgl lenis>
      <section>Your content</section>
    </Wrapper>
  )
}
```

## Effects Components

Animation and visual enhancements.

- **`gsap/`** - GSAP integration with Tempus ([Documentation](effects/gsap/README.md))
- **`marquee/`** - Infinite scrolling text
- **`split-text/`** - Text animation utilities
- **`progress-text/`** - Animated progress indicators
- **`animated-gradient/`** - WebGL gradient animations

```tsx
// Add to root layout
import { GSAPRuntime } from '~/components/effects/gsap/runtime'

// Use in components
import { Marquee } from '~/components/effects/marquee'

<Marquee speed={2}>Scrolling text</Marquee>
```

## Best Practices

### Images

Always use the custom Image component:

```tsx
import { Image } from '~/components/ui/image'

// ✅ Do this
<Image src="/photo.jpg" alt="Photo" />

// ❌ Never do this
import Image from 'next/image'
```

### Links

Use the smart Link component:

```tsx
import { Link } from '~/components/ui/link'

// Automatically handles internal vs external
<Link href="/about">Internal</Link>
<Link href="https://example.com">External (opens new tab)</Link>
```

### Styling

Use CSS modules (import as `s`) + Tailwind utilities:

```tsx
import s from './component.module.css'

<div className={cn(s.wrapper, 'flex items-center')}>
```

## Related

- [GSAP Integration](effects/gsap/README.md)
- [Image Component](ui/image/README.md)
- [Real Viewport](ui/real-viewport/README.md)
- [WebGL Components](../lib/webgl/README.md)
