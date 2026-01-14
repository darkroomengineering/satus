# RealViewport

Sets CSS custom properties for accurate viewport units.

## Usage

```tsx
// In layout (CSS variables only)
<RealViewport />

// With runtime access
import { RealViewport, useRealViewport } from '@/components/ui/real-viewport'

function Component() {
  const { vw, dvh, svh, scrollbarWidth } = useRealViewport()
  return <div>...</div>
}
```

## CSS Variables

| Variable | Description |
|----------|-------------|
| `--vw` | Viewport width unit |
| `--dvh` | Dynamic viewport height |
| `--svh` | Small viewport height |
| `--lvh` | Large viewport height |
| `--scrollbar-width` | Scrollbar width |
