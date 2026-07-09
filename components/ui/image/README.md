# Image Component

Optimized images with smart loading, blur placeholders, and responsive sizing.

## Usage

Sizing is required, not optional: every render must supply **one** of `fill`,
explicit `width` + `height`, or `aspectRatio`. There is no dimension-less
fallback — the type system enforces this at compile time so a missing size
can't silently ship as a layout-shift bug.

```tsx
import { Image } from '@/components/ui/image'

// Basic — aspectRatio derives placeholder dimensions and reserves the box
<Image src="/hero.jpg" alt="Hero" aspectRatio={16/9} />

// LCP images — preload
<Image src="/hero.jpg" alt="Hero" aspectRatio={16/9} preload />

// Fill the nearest positioned ancestor (the ancestor owns sizing)
<Image src="/hero.jpg" alt="Hero" fill />

// Explicit intrinsic dimensions
<Image src="/product.jpg" alt="Product" width={800} height={600} />

// Responsive
<Image 
  src="/product.jpg" 
  alt="Product" 
  aspectRatio={1}
  mobileSize="100vw" 
  desktopSize="33vw" 
/>
```

## Props

| Prop | Description |
|------|-------------|
| `aspectRatio` | **Required** unless `fill` or `width`+`height` are given. Prevents layout shift, enables blur placeholder, and derives placeholder dimensions. |
| `fill` | Fill the nearest positioned ancestor. Mutually exclusive with `width`/`height`. |
| `width` / `height` | Explicit intrinsic pixel dimensions. Required together (unless `aspectRatio` is provided instead). |
| `preload` | Ergonomic alias for next/image's native `preload` prop (LCP images) — also sets `loading="eager"`. Prefer this over passing next/image's deprecated `priority` directly. |
| `mobileSize` / `desktopSize` | Responsive sizing |

## Best Practices

- Sizing is mandatory: pick `fill`, `width`+`height`, or `aspectRatio` — the type won't compile otherwise
- Use `preload` for LCP images
- Never use `next/image` directly
