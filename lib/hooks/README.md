# Hooks

Custom React hooks for common patterns.

```tsx
import { useDeviceDetection } from '@/hooks/use-device-detection'
import { useMediaQuery } from 'hamo'
```

## Available Hooks

| Hook                         | Purpose                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `useReveal`                  | Reveal-on-scroll via IntersectionObserver — CSS-driven, compositor-thread; reduced-motion + no-JS safe |
| `useDeviceDetection`         | Detect screen size, input, motion preference, WebGL support (hardware only)                            |
| `useAfterLoad` / `AfterLoad` | True once `window.load` fired — mount gate for deferrable heavy boot (WebGL, third-party runtimes)     |
| `usePrefetch`                | Prefetch routes on visibility                                                                          |
| `useOnlineStatus`            | Network online/offline status                                                                          |
| `usePreferredColorScheme`    | System theme preference                                                                                |
| `usePreferredReducedMotion`  | Reduced motion preference                                                                              |
| `useDocumentVisibility`      | Tab visibility state                                                                                   |

## useReveal

Reveal children on scroll using IntersectionObserver. Toggles `data-reveal` on the container; children marked `data-reveal-item` animate `transform`/`opacity` on the compositor thread. The CSS contract lives in `lib/styles/css/global.css`. Per-container knobs: `--reveal-transform`, `--reveal-stagger`, `--reveal-duration`. Degrades to visible without JS; short-circuits under `prefers-reduced-motion`.

```tsx
import { useReveal } from '@/hooks/use-reveal'

function Cards({ items }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref}>
      {items.map((i) => (
        <div key={i.id} data-reveal-item>
          {i.name}
        </div>
      ))}
    </div>
  )
}
```

## useAfterLoad

True once the window has fully loaded. Use it as the mount gate for work that
is heavy and invisible during hydration: a WebGL context boot, a shader
compile, a third-party runtime. The root `<Canvas>` already uses it, so
WebGL content portaled into the root canvas needs nothing extra.

```tsx
import { useAfterLoad } from '@/hooks/use-after-load'

function Ground() {
  const afterLoad = useAfterLoad()
  return afterLoad ? <ShaderGround /> : <div className={s.still} />
}
```

`<AfterLoad>` is the same gate as a component, for server trees that cannot
call the hook. Children pass through as references, so nothing new enters the
client bundle:

```tsx
import { AfterLoad } from '@/hooks/use-after-load'

;<AfterLoad>
  <SanityLive />
</AfterLoad>
```

## Browser API Hooks

These hooks use `useSyncExternalStore` for concurrent-rendering safety and optimal performance.

### useMediaQuery

Subscribe to CSS media queries with automatic updates:

```tsx
import { useMediaQuery } from 'hamo'

function ResponsiveComponent() {
  const isDesktop = useMediaQuery('(min-width: 800px)')
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  return isDesktop ? <DesktopView /> : <MobileView />
}
```

### useOnlineStatus

Detect network connectivity:

```tsx
import { useOnlineStatus } from '@/hooks/use-sync-external'

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
import { usePreferredColorScheme } from '@/hooks/use-sync-external'

function ThemeProvider({ children }) {
  const colorScheme = usePreferredColorScheme() // 'light' | 'dark'

  return <div data-theme={colorScheme}>{children}</div>
}
```

### usePreferredReducedMotion

Respect user's motion preferences for accessibility:

```tsx
import { usePreferredReducedMotion } from '@/hooks/use-sync-external'

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
import { useDocumentVisibility } from '@/hooks/use-sync-external'

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

[`hamo`](https://github.com/darkroomengineering/hamo) is a Darkroom package and a
regular dependency. Import from it directly — there is no local re-export layer:

```tsx
import { useScrollTrigger, useTransform, TransformProvider } from 'hamo'
```

The full surface, and what this repo does with it. The unused ones are not
deprecated; they are simply available if you need them.

| Export                                                    | Used here | What it does                                                                 |
| --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `useRect`                                                 | yes       | Element bounding rect, kept in sync on resize and scroll                     |
| `useWindowSize`                                           | yes       | Viewport size, debounced (`useWindowSize(delay?)`)                           |
| `useMediaQuery`                                           | yes       | Match a media query; `undefined` until measured, so it is SSR-safe           |
| `useResizeObserver`                                       | yes       | ResizeObserver as a hook                                                     |
| `useIntersectionObserver`                                 | yes       | IntersectionObserver as a hook                                               |
| `useScrollTrigger`                                        | yes       | Scroll-linked progress callbacks                                             |
| `useTransform` / `TransformProvider` / `TransformContext` | yes       | Nested CSS transform tracking, used by the WebGL rect bridge                 |
| `useDebouncedEffect`                                      | no        | `useEffect` that waits for the delay to elapse                               |
| `useTimeout`                                              | no        | Alias of `useDebouncedEffect`                                                |
| `useDebouncedCallback`                                    | no        | Debounced version of a callback                                              |
| `useDebouncedState`                                       | no        | `useState` whose commits are debounced                                       |
| `useLazyState`                                            | no        | State that does not re-render: a setter, a getter, and an on-change callback |
| `useObjectFit`                                            | no        | `contain` / `cover` scale factors from parent and child dimensions           |
| `useEffectEvent`                                          | no        | See the note below                                                           |

Types: `Rect`, `Transform`, `TransformRef`, `UseScrollTriggerOptions`.

> **Use React's `useEffectEvent`, not hamo's.** React 19.2 ships a stable
> `useEffectEvent`, so import it from `react`. hamo's is an equivalent shim that
> predates it, and keeping two sources for one primitive is how a codebase ends
> up with both. See `lib/webgl/hooks/use-pointer-input.ts` for the pattern:
> wrap a callback so an effect can call the latest version without listing it as
> a dependency and re-subscribing.

## useDeviceDetection

Detect device capabilities (SSR-safe): screen size, input method, motion
preference, WebGL support, Safari, and inline-video autoplay support.
`isWebGL` is false on software renderers (SwiftShader, llvmpipe, headless
audit runners), so the DOM fallback is what PageSpeed Insights measures.

```tsx
import { useDeviceDetection } from '@/hooks/use-device-detection'

function Component() {
  const {
    isMobile,
    isDesktop,
    isReducedMotion,
    isTouchOnly,
    dpr,
    isWebGL,
    isSafari,
    isAutoplaySupported,
  } = useDeviceDetection()

  return isMobile ? <MobileNav /> : <DesktopNav />
}
```

## WebGL Hooks

See [webgl/hooks/](../webgl/hooks/):

| Hook              | Purpose                    |
| ----------------- | -------------------------- |
| `useWebGLElement` | Rect + visibility tracking |
| `useWebGLRect`    | DOM-to-WebGL position sync |

## Viewport

There is no viewport hook. Use CSS viewport units (`dvh`, `svh`, `lvh`) directly;
[components/ui/real-viewport](../../components/ui/real-viewport/README.md) sets the
`--scrollbar-width` CSS custom property for scrollbar-aware layouts.
