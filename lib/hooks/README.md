# Hooks

Custom React hooks for common patterns.

```tsx
import { useDeviceDetection } from '@/hooks'
import { useMediaQuery } from 'hamo'
```

## Available Hooks

| Hook | Purpose |
|------|---------|
| `useReveal` | Reveal-on-scroll via IntersectionObserver — CSS-driven, compositor-thread; reduced-motion + no-JS safe |
| `useDeviceDetection` | Detect mobile/desktop/tablet |
| `usePrefetch` | Prefetch routes on visibility |
| `useOnlineStatus` | Network online/offline status |
| `usePreferredColorScheme` | System theme preference |
| `usePreferredReducedMotion` | Reduced motion preference |
| `useDocumentVisibility` | Tab visibility state |

## useReveal

Reveal children on scroll using IntersectionObserver. Toggles `data-reveal` on the container; children marked `data-reveal-item` animate `transform`/`opacity` on the compositor thread. The CSS contract lives in `lib/styles/css/global.css`. Per-container knobs: `--reveal-transform`, `--reveal-stagger`, `--reveal-duration`. Degrades to visible without JS; short-circuits under `prefers-reduced-motion`.

```tsx
import { useReveal } from '@/hooks'

function Cards({ items }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref}>
      {items.map((i) => <div key={i.id} data-reveal-item>{i.name}</div>)}
    </div>
  )
}
```

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

  // Pass as a CSS custom property or GSAP duration — CSS transitions
  // and useReveal already short-circuit automatically.
  const duration = prefersReducedMotion ? 0 : 0.3

  return (
    <div style={{ '--duration': `${duration}s` } as React.CSSProperties}>
      {/* children animate via CSS transition using var(--duration) */}
    </div>
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

## Hooks from `hamo`

`useScrollTrigger`, `useTransform`, `TransformProvider`, `useRect`, `useWindowSize`, and `useMediaQuery` are provided by the [`hamo`](https://github.com/darkroomengineering/hamo) package. Import them directly:

```tsx
import { useScrollTrigger, useTransform, TransformProvider } from 'hamo'
```

## useDeviceDetection

Detect device type (SSR-safe):

```tsx
import { useDeviceDetection } from '@/hooks'

function Component() {
  const { isMobile, isTablet, isDesktop, isTouch } = useDeviceDetection()

  return isMobile ? <MobileNav /> : <DesktopNav />
}
```

## WebGL Hooks

See [webgl/hooks/](../webgl/hooks/):

| Hook | Purpose |
|------|---------|
| `useWebGLElement` | Rect + visibility tracking |
| `useWebGLRect` | DOM-to-WebGL position sync |

## Viewport

There is no viewport hook. Use CSS viewport units (`dvh`, `svh`, `lvh`) directly;
[components/ui/real-viewport](../../components/ui/real-viewport/README.md) sets the
`--scrollbar-width` CSS custom property for scrollbar-aware layouts.
