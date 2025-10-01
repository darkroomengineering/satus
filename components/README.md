# Components

Reusable UI components for the application.

## Available Components

**Core**
- `link/` - Smart navigation (auto-detects external links, prefetching)
- `form/` - Form components with validation
- `image/` - Optimized images (never use `next/image` directly)
- `select/` - Custom select/dropdown
- `dropdown/` - Dropdown menus

**Animation**
- `animated-gradient/` - WebGL gradient animations
- `gsap/` - GSAP-powered animations ([Documentation](gsap/README.md))
- `marquee/` - Infinite scrolling text
- `progress-text/` - Animated progress indicators
- `split-text/` - Text animation utilities

**Layout**
- `accordion/` - Expandable sections
- `fold/` - Folding animations
- `real-viewport/` - Accurate viewport dimensions
- `scrollbar/` - Custom scrollbars
- `scroll-restoration/` - Preserve scroll position

**Development**
- `performance-monitor/` - Core Web Vitals tracking
- `console/` - Console utilities

## Usage

```tsx
import { Link } from '~/components/link'
import { Form, Input, SubmitButton } from '~/components/form'
import { Image } from '~/components/image'
import { GSAPRuntime } from '~/components/gsap/runtime'
import { Accordion } from '~/components/accordion'

// Link automatically detects external URLs
<Link href="/about">Internal</Link>
<Link href="https://example.com">External</Link>

// Always use custom Image component
<Image src="/photo.jpg" alt="Photo" />

// Add GSAPRuntime to layout for GSAP + Lenis
<GSAPRuntime />
```

## Best Practices

- **Images**: Always use `~/components/image`, never `next/image`
- **Links**: Use `~/components/link` for smart prefetching
- **GSAP**: Add `<GSAPRuntime />` in layout for ScrollTrigger + Lenis
- **Styling**: Use CSS modules (import as `s`) + Tailwind utilities

## Related Documentation

- [GSAP Integration](gsap/README.md)
- [Image Component](image/README.md)
- [Styling System](../styles/README.md)
