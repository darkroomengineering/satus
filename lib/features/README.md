# Optional Features

Conditionally loaded features for the app layout.

## Overview

`OptionalFeatures` is mounted in `app/(site)/layout.tsx` and conditionally loads heavy dependencies based on usage. React `lazy()` preserves code splitting, while `use(browser())` keeps their rendering in the browser. This replaces the previous `next/dynamic` browser-only rendering contract; it does not imply a reduction in bundle size.

## Features

| Feature      | Trigger                                      | Description                                             |
| ------------ | -------------------------------------------- | ------------------------------------------------------- |
| GSAP Runtime | Opt-in via the `gsap` prop (default `false`) | Syncs GSAP with Tempus RAF                              |
| WebGL Canvas | Always mounted (shared strategy)             | Persistent Three.js canvas (no-op on non-WebGL devices) |
| Dev Tools    | Development mode                             | Orchestra debug panel                                   |

`OptionalFeatures({ gsap = false })` keeps the GSAP runtime off by default. `app/(site)/layout.tsx` passes `<OptionalFeatures gsap />`, which turns it on for every page under that layout. Drop the `gsap` prop only if no page under that layout uses `useGSAP` or ScrollTrigger — otherwise scrubbed animations end up a frame behind Tempus. This file is the single source of truth for that default; other docs should link here instead of restating it.

## WebGL

`OptionalFeatures` mounts the shared root canvas (`<Canvas root />`) so the
WebGL context persists across navigation. Pages portal 3D content into it with
`<WebGLTunnel>` — no per-page setup needed:

```tsx
import { WebGLTunnel } from '@/webgl/components/tunnel'

export default function MyPage() {
  return (
    <Wrapper>
      <WebGLTunnel>{/* Your 3D content */}</WebGLTunnel>
    </Wrapper>
  )
}
```

This is the shared strategy. The per-page alternative is `<Wrapper webgl>`,
which mounts the canvas on that page instead — pick one (see
`lib/webgl/README.md`). Either way:

1. The canvas mounts only on WebGL-capable devices; the capability probe and the canvas module still load
2. GPU capability is detected via a WebGL 2 context probe on a desktop
   viewport (`useDeviceDetection().isWebGL`)
3. With the shared strategy, the context persists across navigation
4. GPU boot still waits for `window.load` through `useAfterLoad`; `browser()` does not replace that scheduling gate

### Dev Tools

Automatically enabled in development. Access with `Cmd/Ctrl + O`.

## How It Works

```tsx
// app/(site)/layout.tsx - already configured
<OptionalFeatures gsap />
```

The component:

1. Renders a null Suspense fallback on the server because `BrowserFeatures` calls `use(browser())`
2. Renders `BrowserFeatures` in the browser, where `browser()` does not suspend
3. Loads each enabled feature through `lazy()` inside its own null Suspense boundary, so one pending chunk does not hold up the other features
4. Preserves the WebGL device and load gates inside the canvas component

## Adding Custom Features

```tsx
// lib/features/index.tsx

const MyFeature = lazy(() =>
  import('@/components/my-feature').then((mod) => ({ default: mod.MyFeature }))
)

// Render inside BrowserFeatures when the feature is enabled.
{
  enabled && (
    <Suspense fallback={null}>
      <MyFeature />
    </Suspense>
  )
}
```

## Architecture Note

This pattern keeps the root layout clean while allowing opt-in features. Features are code-split and only downloaded when needed.
