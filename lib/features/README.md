# Optional Features

Conditionally loaded features for the root layout.

## Overview

`OptionalFeatures` is mounted in `app/layout.tsx` and conditionally loads heavy dependencies based on usage. This prevents unused features from bloating the client bundle.

## Features

| Feature | Trigger | Description |
|---------|---------|-------------|
| GSAP Runtime | Always loaded | Syncs GSAP with Tempus RAF |
| WebGL Canvas | Always mounted (shared strategy) | Persistent Three.js canvas (no-op on non-WebGL devices) |
| Dev Tools | Development mode | Orchestra debug panel |

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
// app/layout.tsx - already configured
<OptionalFeatures />
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
{process.env.NEXT_PUBLIC_MY_FEATURE === 'true' && <MyFeature />}
```

## Architecture Note

This pattern keeps the root layout clean while allowing opt-in features. Features are code-split and only downloaded when needed.
