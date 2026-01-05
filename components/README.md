# Components

UI components organized by purpose.

```
components/
├── ui/        → Primitives (reusable across projects)
├── layout/    → Site chrome (customize per project)
└── effects/   → Animation & visual enhancements
```

## Quick Imports

```tsx
import { Image, Link, Menu, Select, Tabs, Toast } from '~/components/ui'
import { Wrapper, Navigation, Footer } from '~/components/layout'
import { Marquee, GSAPRuntime } from '~/components/effects'
```

## UI Components

Built on [Base UI](https://base-ui.com/) for accessibility.

| Component | Purpose |
|-----------|---------|
| `image/` | Optimized images (always use this, never `next/image`) |
| `link/` | Smart navigation (auto-detects external) |
| `form/` | Form components with validation |
| `select/` | Custom dropdowns |
| `menu/` | Dropdown menus |
| `accordion/` | Expandable sections |
| `tabs/` | Tab navigation |
| `tooltip/` | Hover hints |
| `alert-dialog/` | Confirmation dialogs |
| `toast/` | Notifications |
| `checkbox/` | Checkboxes |
| `switch/` | Toggle switches |
| `fold/` | Scroll-based folding |
| `scrollbar/` | Custom scrollbars |
| `real-viewport/` | Viewport CSS properties |

## Layout Components

| Component | Purpose |
|-----------|---------|
| `wrapper/` | Page wrapper (theme, WebGL, Lenis) |
| `navigation/` | Site navigation |
| `footer/` | Site footer |
| `lenis/` | Smooth scrolling |

```tsx
<Wrapper theme="dark" webgl lenis>
  <section>Your content</section>
</Wrapper>
```

## Effects Components

| Component | Purpose |
|-----------|---------|
| `gsap/` | GSAP + Tempus integration |
| `marquee/` | Infinite scrolling text |
| `split-text/` | Text animation utilities |
| `animated-gradient/` | WebGL gradients |

## Best Practices

```tsx
// ✅ Always use custom Image
import { Image } from '~/components/ui/image'
<Image src="/photo.jpg" alt="Photo" aspectRatio={16/9} />

// ✅ Always use custom Link
import { Link } from '~/components/ui/link'
<Link href="/about">Internal</Link>
<Link href="https://example.com">External</Link>

// ✅ CSS Modules + Tailwind
import s from './component.module.css'
<div className={cn(s.wrapper, 'flex items-center')} />
```

## Related

- [Image docs](ui/image/README.md)
- [Real Viewport docs](ui/real-viewport/README.md)
- [WebGL Components](../lib/webgl/README.md)
