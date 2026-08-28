# Optional Features

Conditionally loaded features for the app layout.

## Overview

`OptionalFeatures` is mounted in `app/(site)/layout.tsx` and conditionally loads heavy dependencies based on usage. This prevents unused features from bloating the client bundle.

## Features

| Feature      | Trigger                                      | Description                                             |
| ------------ | -------------------------------------------- | ------------------------------------------------------- |
| GSAP Runtime | Opt-in via the `gsap` prop (default `false`) | Syncs GSAP with Tempus RAF                              |
| WebGL Canvas | Always mounted (shared strategy)             | Persistent Three.js canvas (no-op on non-WebGL devices) |
| Dev Tools    | Development mode                             | Orchestra debug panel                                   |

`OptionalFeatures({ gsap = false, webgl, ... })` keeps the GSAP runtime off by default, saving the ~43 KB it adds to the client bundle on sites that never animate with GSAP. `app/(site)/layout.tsx` passes `<OptionalFeatures gsap />`, which turns it on for every page under that layout. Drop the `gsap` prop only if no page under that layout uses `useGSAP` or ScrollTrigger — otherwise scrubbed animations end up a frame behind Tempus. This file is the single source of truth for that default; other docs should link here instead of restating it.

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

1. The canvas mounts only on WebGL-capable devices (zero overhead otherwise)
2. GPU capability is detected via a WebGL 2 context probe on a desktop
   viewport (`useDeviceDetection().isWebGL`)
3. With the shared strategy, the context persists across navigation

### Dev Tools

Automatically enabled in development. Access with `Cmd/Ctrl + O`.

## How It Works

```tsx
// app/(site)/layout.tsx - already configured
<OptionalFeatures gsap />
```

The component:

1. Waits for client-side hydration
2. Dynamically imports features with code splitting
3. Renders with `ssr: false` to avoid hydration issues
4. The WebGL canvas mounts only on WebGL-capable devices

## Adding Custom Features

```tsx
// lib/features/index.tsx

const MyFeature = dynamic(
  () => import('@/components/my-feature').then((mod) => mod.MyFeature),
  { ssr: false }
)

// Conditionally render based on env var or other condition
{
  process.env.NEXT_PUBLIC_MY_FEATURE === 'true' && <MyFeature />
}
```

## Architecture Note

This pattern keeps the root layout clean while allowing opt-in features. Features are code-split and only downloaded when needed.
