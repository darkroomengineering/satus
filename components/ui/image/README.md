# Image Component

Optimized images with smart loading, blur placeholders, and responsive sizing.

## Usage

```tsx
import { Image } from '@/components/ui/image'

// Basic
<Image src="/hero.jpg" alt="Hero" aspectRatio={16/9} />

// Priority (LCP images)
<Image src="/hero.jpg" alt="Hero" aspectRatio={16/9} priority />

// Responsive
<Image 
  src="/product.jpg" 
  alt="Product" 
  mobileSize="100vw" 
  desktopSize="33vw" 
/>
```

## Props

| Prop | Description |
|------|-------------|
| `aspectRatio` | Prevents layout shift, enables blur placeholder |
| `priority` | Eager loading for above-the-fold images |
| `mobileSize` / `desktopSize` | Responsive sizing |

## Best Practices

- Always provide `aspectRatio` (prevents CLS)
- Use `priority` for LCP images
- Never use `next/image` directly
