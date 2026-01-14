# Hooks

Custom React hooks.

```tsx
import { useScrollTrigger, useDeviceDetection, useStore } from '@/hooks'
```

## Available Hooks

| Hook | Purpose |
|------|---------|
| `useDeviceDetection` | Detect mobile/desktop/tablet |
| `usePrefetch` | Prefetch routes on visibility |
| `useScrollTrigger` | Scroll-based animations |
| `useTransform` | Element transformations |
| `useStore` | Global Zustand store |

## useScrollTrigger

```tsx
import { useRect } from 'hamo/use-rect'
import { useScrollTrigger } from '@/hooks'

function ScrollAnimation() {
  const [setRectRef, rect] = useRect()

  useScrollTrigger({
    rect,
    start: 'bottom bottom',
    end: 'center center',
    scrub: true,
    onProgress: ({ progress }) => {
      rect.element.style.opacity = progress
    },
  })

  return <div ref={setRectRef}>Animated element</div>
}
```

## useDeviceDetection

```tsx
const { isMobile, isTablet, isDesktop, isTouch } = useDeviceDetection()
```

## WebGL Hooks

See [webgl/hooks/](../webgl/hooks/):
- `useWebGLElement` — Rect + visibility tracking
- `useWebGLRect` — DOM-to-WebGL position sync
