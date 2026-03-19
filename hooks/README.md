# Hooks

Custom React hooks for common patterns.

```tsx
import { useScrollTrigger, useDeviceDetection, useMediaQuery } from '@/hooks'
```

## Available Hooks

| Hook | Purpose |
|------|---------|
| `useScrollTrigger` | Scroll-based animations |
| `useTransform` | Element transformations |
| `useDeviceDetection` | Detect mobile/desktop/tablet |
| `usePrefetch` | Prefetch routes on visibility |
| `useStore` | Global Zustand store |
| `useMediaQuery` | CSS media query subscription |
| `useOnlineStatus` | Network online/offline status |
| `usePreferredColorScheme` | System theme preference |
| `usePreferredReducedMotion` | Reduced motion preference |
| `useDocumentVisibility` | Tab visibility state |

## Browser API Hooks

These hooks use `useSyncExternalStore` for concurrent-rendering safety and optimal performance.

### useMediaQuery

Subscribe to CSS media queries with automatic updates:

```tsx
import { useMediaQuery } from '@/hooks'

function ResponsiveComponent() {
  const isDesktop = useMediaQuery('(min-width: 800px)')
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  return isDesktop ? <DesktopView /> : <MobileView />
}
```

### useOnlineStatus

Detect network connectivity:

```tsx
import { useOnlineStatus } from '@/hooks'

function NetworkAwareComponent() {
  const isOnline = useOnlineStatus()

  if (!isOnline) {
    return <OfflineBanner />
  }

  return <App />
}
```

### usePreferredColorScheme

Get system color scheme preference:

```tsx
import { usePreferredColorScheme } from '@/hooks'

function ThemeProvider({ children }) {
  const colorScheme = usePreferredColorScheme() // 'light' | 'dark'

  return <div data-theme={colorScheme}>{children}</div>
}
```

### usePreferredReducedMotion

Respect user's motion preferences for accessibility:

```tsx
import { usePreferredReducedMotion } from '@/hooks'

function AnimatedComponent() {
  const prefersReducedMotion = usePreferredReducedMotion()

  const duration = prefersReducedMotion ? 0 : 300

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: duration / 1000 }}
    />
  )
}
```

### useDocumentVisibility

React to tab visibility changes:

```tsx
import { useDocumentVisibility } from '@/hooks'

function VideoPlayer() {
  const visibility = useDocumentVisibility() // 'visible' | 'hidden'
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (visibility === 'hidden') {
      videoRef.current?.pause()
    }
  }, [visibility])

  return <video ref={videoRef} />
}
```

## useScrollTrigger

GSAP ScrollTrigger-like scroll animations with Lenis integration:

```tsx
import { useRect } from 'hamo'
import { useScrollTrigger } from '@/hooks'

function ScrollAnimation() {
  const [setRectRef, rect] = useRect()

  useScrollTrigger({
    rect,
    start: 'bottom bottom', // element bottom meets viewport bottom
    end: 'top top',         // element top meets viewport top
    onProgress: ({ progress, isActive }) => {
      // progress: 0-1 animation progress
      // isActive: whether element is in trigger zone
      element.style.opacity = String(progress)
    },
    onEnter: () => console.log('Entered'),
    onLeave: () => console.log('Left'),
  })

  return <div ref={setRectRef}>Animated element</div>
}
```

### Position Syntax

Format: `"element-position viewport-position"`

| Position | Element | Viewport |
|----------|---------|----------|
| `top` | Top edge | Top of viewport |
| `center` | Vertical center | Center of viewport |
| `bottom` | Bottom edge | Bottom of viewport |
| `100` | 100px from top | 100px from viewport top |

Examples:
- `'bottom bottom'` - Element bottom meets viewport bottom
- `'top center'` - Element top meets viewport center
- `'center 100'` - Element center meets 100px from viewport top

## useDeviceDetection

Detect device type (SSR-safe):

```tsx
import { useDeviceDetection } from '@/hooks'

function Component() {
  const { isMobile, isTablet, isDesktop, isTouch } = useDeviceDetection()

  return isMobile ? <MobileNav /> : <DesktopNav />
}
```

## useTransform

Coordinate transforms between elements:

```tsx
import { TransformProvider, useTransform } from '@/hooks'

function Parent() {
  return (
    <TransformProvider>
      <Child />
    </TransformProvider>
  )
}

function Child() {
  const getTransform = useTransform()

  useEffect(() => {
    const { translate, scale } = getTransform()
    // Use transform values
  }, [getTransform])
}
```

## WebGL Hooks

See [webgl/hooks/](../webgl/hooks/):

| Hook | Purpose |
|------|---------|
| `useWebGLElement` | Rect + visibility tracking |
| `useWebGLRect` | DOM-to-WebGL position sync |

## Viewport Hook

For viewport values, see [components/ui/real-viewport](../../components/ui/real-viewport/README.md):

```tsx
import { useViewport } from '@/components/ui/real-viewport'

// Only re-renders when dvh changes
const dvh = useViewport(state => state.dvh)
```
