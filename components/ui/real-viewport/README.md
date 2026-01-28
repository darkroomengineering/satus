# RealViewport

Sets CSS custom properties for accurate viewport units and provides React hooks for viewport values.

## Usage

### CSS Variables Only

```tsx
// app/layout.tsx
import { RealViewport } from '@/components/ui/real-viewport'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RealViewport />
        {children}
      </body>
    </html>
  )
}
```

### With Runtime Access (Recommended)

Use `useViewport` with a selector for optimal performance - components only re-render when their selected value changes:

```tsx
import { useViewport } from '@/components/ui/real-viewport'

function Component() {
  // Only re-renders when dvh changes (not when vw or other values change)
  const dvh = useViewport(state => state.dvh)

  return <div style={{ height: `${dvh * 100}px` }}>Full height</div>
}
```

### Computed Values

```tsx
function ResponsiveComponent() {
  // Only re-renders when the boolean result changes
  const isShortViewport = useViewport(state => state.dvh < 6)

  return isShortViewport ? <CompactView /> : <FullView />
}
```

### All Values (Less Optimal)

```tsx
function Component() {
  // Re-renders on ANY viewport change - use sparingly
  const { vw, dvh, svh, scrollbarWidth } = useViewport()

  return <div>...</div>
}
```

## API

### `useViewport(selector?)`

Subscribe to viewport values with optional selector for granular updates.

| Parameter | Type | Description |
|-----------|------|-------------|
| `selector` | `(state: ViewportValues) => T` | Optional selector function |

**Returns:** Selected value or full `ViewportValues` object

### `ViewportValues`

| Property | Type | Description |
|----------|------|-------------|
| `vw` | `number` | Viewport width / 100 |
| `dvh` | `number` | Dynamic viewport height / 100 |
| `svh` | `number` | Small viewport height / 100 |
| `lvh` | `number` | Large viewport height / 100 |
| `scrollbarWidth` | `number` | Scrollbar width in pixels |

## CSS Variables

Available after `<RealViewport />` mounts:

| Variable | Description | Example |
|----------|-------------|---------|
| `--vw` | Viewport width unit | `width: calc(100 * var(--vw))` |
| `--dvh` | Dynamic viewport height | `height: calc(100 * var(--dvh))` |
| `--svh` | Small viewport height | `min-height: calc(100 * var(--svh))` |
| `--lvh` | Large viewport height | `max-height: calc(100 * var(--lvh))` |
| `--scrollbar-width` | Scrollbar width | `width: calc(100vw - var(--scrollbar-width))` |

## Performance

The `useViewport` hook uses `useSyncExternalStore` for:

- **Concurrent rendering safety** - Works with React 18+ Suspense/transitions
- **Granular subscriptions** - Only re-renders when selected value changes
- **SSR support** - Proper server snapshots (returns zeros)

### Best Practices

```tsx
// ✅ Good - only subscribes to what's needed
const dvh = useViewport(state => state.dvh)

// ✅ Good - computed value, re-renders only when result changes
const isMobile = useViewport(state => state.vw < 8)

// ⚠️ Avoid - re-renders on any viewport change
const { vw, dvh } = useViewport()
```

## Migration

If using the deprecated `useRealViewport`:

```tsx
// Before
const { dvh } = useRealViewport()

// After (better performance)
const dvh = useViewport(state => state.dvh)
```
