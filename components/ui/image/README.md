# Image Component

Optimized images with smart loading, blur placeholders, and responsive sizing. Never use `next/image` directly.

## Required props

- **Sizing:** every render supplies **one** of `fill`, explicit `width` + `height`, or `aspectRatio`. The type fails to compile otherwise, so a missing size can't ship as a layout-shift bug.
- **`sizes`:** every render supplies **either** `mobileSize` + `desktopSize`, **or** a raw `sizes` string. There is no `100vw` fallback: a wrong-by-default `sizes` raises no error, it just makes the browser fetch a full-viewport-width candidate for what might be a thumbnail, and only measuring network requests catches it.

```tsx
<Image src="/hero.jpg" alt="Hero" aspectRatio={16/9} mobileSize="100vw" desktopSize="50vw" preload />
<Image src="/product.jpg" alt="Product" fill sizes="(min-width: 1024px) 400px, 80vw" />
```

## Props

| Prop                         | Description                                                                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aspectRatio`                | **Required** unless `fill` or `width`+`height` are given. Prevents layout shift, enables blur placeholder, and derives placeholder dimensions.                                                                                            |
| `fill`                       | Fill the nearest positioned ancestor (the ancestor owns sizing). Mutually exclusive with `width`/`height`.                                                                                                                                |
| `width` / `height`           | Explicit intrinsic pixel dimensions. Required together (unless `aspectRatio` is provided instead).                                                                                                                                        |
| `preload`                    | Use on LCP images. Alias for next/image's native `preload` prop that also sets `loading="eager"`. Prefer it over next/image's deprecated `priority`.                                                                                      |
| `mobileSize` / `desktopSize` | Rendered width below / at-and-above the desktop breakpoint (e.g. `"50vw"`). **Required together**, unless `sizes` is passed instead.                                                                                                      |
| `sizes`                      | Raw `sizes` attribute, for layouts `mobileSize`/`desktopSize` can't express. **Required** unless `mobileSize`+`desktopSize` are given.                                                                                                    |
| `objectFit`                  | CSS `object-fit`. Defaults to `cover` via a zero-specificity CSS rule, so consumer CSS (a CSS Module or a Tailwind utility) overrides it without extra specificity. Passing the prop applies it as an inline style, which wins over both. |

## Loaders

Images on `cdn.sanity.io` skip Next's optimizer: `sanity-loader.ts` has Sanity's CDN resize each `srcset` width, as WebP. A `cdn.sanity.io/files/` URL (an image uploaded to a `file` field) can't be resized there, so it renders unoptimized, at its original size. Everything else goes through the optimizer, also as WebP only.
