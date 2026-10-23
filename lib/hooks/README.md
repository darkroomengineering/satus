# Hooks

Custom React hooks, imported from `@/hooks/<file>`.

## Available Hooks

| Hook                         | File                   | Purpose                                                                                               |
| ---------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `useReveal`                  | `use-reveal`           | Reveal-on-scroll via IntersectionObserver: CSS-driven, compositor-thread; reduced-motion + no-JS safe |
| `useDeviceDetection`         | `use-device-detection` | Detect screen size, input, motion preference, WebGL support (hardware only)                           |
| `useAfterLoad` / `AfterLoad` | `use-after-load`       | True once `window.load` fired; mount gate for deferrable heavy boot (WebGL, third-party runtimes)     |
| `usePrefetch`                | `use-prefetch`         | Prefetch routes on visibility                                                                         |
| `useOnlineStatus`            | `use-sync-external`    | Network online/offline status (`boolean`)                                                             |
| `usePreferredColorScheme`    | `use-sync-external`    | System theme preference (`'light' \| 'dark'`)                                                         |
| `usePreferredReducedMotion`  | `use-sync-external`    | Reduced motion preference (`boolean`)                                                                 |
| `useDocumentVisibility`      | `use-sync-external`    | Tab visibility state (`'visible' \| 'hidden'`)                                                        |

The `use-sync-external` hooks use `useSyncExternalStore` for concurrent-rendering safety. WebGL hooks (`useWebGLRect`) are in [lib/webgl/README.md](../webgl/README.md#hooks).

## useReveal

```tsx
const ref = useReveal<HTMLDivElement>()
// <div ref={ref}>{items.map((i) => <div key={i.id} data-reveal-item>…</div>)}</div>
```

Toggles `data-reveal` on the container; children marked `data-reveal-item` animate `transform`/`opacity` on the compositor thread. The CSS contract lives in `lib/styles/css/global.css`. Per-container knobs: `--reveal-transform`, `--reveal-stagger`, `--reveal-duration`. Degrades to visible without JS; short-circuits under `prefers-reduced-motion`.

## useAfterLoad

True once the window has fully loaded. Use it as the mount gate for work that
is heavy and invisible during hydration: a WebGL context boot, a shader
compile, a third-party runtime. The root `<Canvas>` already uses it, so
WebGL content portaled into the root canvas needs nothing extra.

`<AfterLoad>` is the same gate as a component, for server trees that cannot
call the hook. Children pass through as references, so nothing new enters the
client bundle.

## useDeviceDetection

SSR-safe device capabilities: `isMobile`, `isDesktop`, `isReducedMotion`,
`isTouchOnly`, `dpr`, `isWebGL`, `isSafari`, `isAutoplaySupported`.
`isWebGL` is false on software renderers (SwiftShader, llvmpipe, headless
audit runners), so the DOM fallback is what PageSpeed Insights measures. It is
also false below the desktop breakpoint and on touch-only devices
(`isTouchOnly`), so phones in landscape and tablets get the fallback too.

### Media queries

There is no general media-query hook. To show or hide markup per breakpoint,
use the `desktop-only` and `mobile-only` classes, not `isMobile`/`isDesktop`:
they need no JavaScript and match the server render, while the hook has no
value until mount. For behavior that differs by device, read the
`useDeviceDetection` flags, and add a new query there rather than in a
component. Importing hamo's `useMediaQuery` anywhere else is a lint error.

## usePrefetch

`usePrefetch(href, { rootMargin })` prefetches a route when an element scrolls
into view, through hamo's `useIntersectionObserver`. Skipped on 2G and
Save-Data connections. Returns a ref callback, not a ref object.

## Hooks from `hamo`

[`hamo`](https://github.com/darkroomengineering/hamo) is a Darkroom package and a
regular dependency. Import from it directly; there is no local re-export layer.
The unused exports are not deprecated, just available.

| Export                                                    | Used here | What it does                                                                 |
| --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `useRect`                                                 | yes       | Element bounding rect, kept in sync on resize and scroll                     |
| `useWindowSize`                                           | yes       | Viewport size, debounced (`useWindowSize(delay?)`)                           |
| `useMediaQuery`                                           | yes       | Only inside `useDeviceDetection`; importing it elsewhere is a lint error     |
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

> **Use React's `useEffectEvent`, not hamo's.** React ships a stable
> `useEffectEvent`; hamo's is an equivalent shim, and two sources for one
> primitive end up both in use. `lib/webgl/hooks/use-pointer-input.ts` shows
> the pattern: an effect calls the latest callback without listing it as a
> dependency and re-subscribing.

## Viewport

There is no viewport hook. Use CSS viewport units (`dvh`, `svh`, `lvh`) directly;
[components/ui/real-viewport](../../components/ui/real-viewport/README.md) sets the
`--scrollbar-width` CSS custom property for scrollbar-aware layouts.
