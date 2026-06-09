# RealViewport

Sets CSS custom properties for accurate viewport measurements.

## Usage

```tsx
// app/layout.tsx
import { RealViewport } from '@/components/ui/real-viewport'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RealViewport>{children}</RealViewport>
      </body>
    </html>
  )
}
```

## CSS Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `--scrollbar-width` | Browser scrollbar width in pixels | `width: calc(100vw - var(--scrollbar-width))` |

## Implementation notes

- Updates on `resize` (passive listener)
- Scrollbar width is recalculated on each resize in case the user switches between
  overflow modes (e.g. a modal opens/closes)
- No JavaScript store or subscription — only CSS custom properties are set
