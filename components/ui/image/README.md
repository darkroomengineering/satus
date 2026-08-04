# Image Component

Optimized images with smart loading, blur placeholders, and responsive sizing.

## Usage

Sizing is required, not optional: every render must supply **one** of `fill`,
explicit `width` + `height`, or `aspectRatio`. There is no dimension-less
fallback — the type system enforces this at compile time so a missing size
can't silently ship as a layout-shift bug.

`sizes` is required too: every render must supply **either** `mobileSize` +
`desktopSize` together, **or** a raw `sizes` string. There is no `100vw`
fallback — a wrong-by-default `sizes` doesn't error or warn, it just makes the
browser fetch a full-viewport-width candidate for what might be a thumbnail,
and nothing short of measuring network requests catches it.

```tsx
import { Image } from '@/components/ui/image'

// Basic — aspectRatio derives placeholder dimensions and reserves the box
<Image src="/hero.jpg" alt="Hero" aspectRatio={16/9} mobileSize="100vw" desktopSize="100vw" />

// LCP images — preload
<Image src="/hero.jpg" alt="Hero" aspectRatio={16/9} mobileSize="100vw" desktopSize="100vw" preload />

// Fill the nearest positioned ancestor (the ancestor owns sizing)
<Image src="/hero.jpg" alt="Hero" fill mobileSize="100vw" desktopSize="100vw" />

// Explicit intrinsic dimensions
<Image src="/product.jpg" alt="Product" width={800} height={600} mobileSize="100vw" desktopSize="50vw" />

// Responsive
<Image
  src="/product.jpg"
  alt="Product"
  aspectRatio={1}
  mobileSize="100vw"
  desktopSize="33vw"
/>

// Raw sizes string, for layouts mobileSize/desktopSize can't express
<Image src="/product.jpg" alt="Product" aspectRatio={1} sizes="(min-width: 1024px) 400px, 80vw" />
```

## Props

| Prop                         | Description                                                                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aspectRatio`                | **Required** unless `fill` or `width`+`height` are given. Prevents layout shift, enables blur placeholder, and derives placeholder dimensions.                                                                                            |
| `fill`                       | Fill the nearest positioned ancestor. Mutually exclusive with `width`/`height`.                                                                                                                                                           |
| `width` / `height`           | Explicit intrinsic pixel dimensions. Required together (unless `aspectRatio` is provided instead).                                                                                                                                        |
| `preload`                    | Ergonomic alias for next/image's native `preload` prop (LCP images) — also sets `loading="eager"`. Prefer this over passing next/image's deprecated `priority` directly.                                                                  |
| `mobileSize` / `desktopSize` | Rendered width below / at-and-above the desktop breakpoint (e.g. `"50vw"`). **Required together**, unless `sizes` is passed instead.                                                                                                      |
| `sizes`                      | Raw `sizes` attribute, for layouts `mobileSize`/`desktopSize` can't express. **Required** unless `mobileSize`+`desktopSize` are given.                                                                                                    |
| `objectFit`                  | CSS `object-fit`. Defaults to `cover` via a zero-specificity CSS rule, so consumer CSS (a CSS Module or a Tailwind utility) overrides it without extra specificity. Passing the prop applies it as an inline style, which wins over both. |

## Best Practices

- Sizing is mandatory: pick `fill`, `width`+`height`, or `aspectRatio` — the type won't compile otherwise
- `sizes` is mandatory too: pick `mobileSize`+`desktopSize`, or a raw `sizes` string — same reasoning, same enforcement
- Use `preload` for LCP images
- Never use `next/image` directly
