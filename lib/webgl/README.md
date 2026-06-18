# WebGL / WebGPU / React Three Fiber

GPU-accelerated 3D rendering with a persistent root canvas.

## Quick Start

```tsx
import { Wrapper } from '@/components/layout'
import { WebGLTunnel } from '@/webgl/components/tunnel'

export default function Page() {
  return (
    <Wrapper>
      <WebGLTunnel>
        <My3DScene />
      </WebGLTunnel>
      <section>HTML overlay</section>
    </Wrapper>
  )
}
```

No configuration needed — the root canvas is mounted once in the shared layout
(`lib/features`), so any page can portal 3D content into it with `<WebGLTunnel>`.

### Two canvas strategies (pick one)

The canvas is mounted with `<Canvas root>`. Choose **one** place to do it:

- **Shared (default):** `<Canvas root />` lives in the layout (`lib/features`),
  so the context persists across route navigation. Pages just use
  `<WebGLTunnel>`.
- **Per page:** remove the shared canvas and pass `webgl` to the Wrapper
  (`<Wrapper webgl>`), which mounts the canvas only on that page.

Enabling both mounts two canvases — keep one strategy.

## Device gating

The canvas is rendered only when `useDeviceDetection().isWebGL` is true (a
working WebGL2 context on a desktop viewport). On mobile or unsupported
devices it's a no-op — nothing mounts. Rendering is driven manually by the
`RAF` component (`frameloop="never"`), not the default r3f render loop.

## Architecture

```
<Canvas root> (layout OR per-page Wrapper) → rendered only when isWebGL
    └─ WebGLTunnel.Out (portals 3D content from any page)
```

**Key benefits (shared/layout strategy):**
- Context persists across navigation (no recreation)
- Seamless route transitions
- Shared assets stay loaded
- No-op on non-WebGL devices

## Components

| Component | Purpose |
|-----------|---------|
| `Canvas` | Mounts the canvas via `root` (layout or per-page Wrapper) |
| `WebGLTunnel` | Portal 3D content into the canvas |
| `DOMTunnel` | Portal HTML overlays |

## Hooks

```tsx
import { useDeviceDetection } from '@/hooks/use-device-detection'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

// Sync a DOM element's rect into the scene (+ on-screen visibility)
const { setRef, rect, isVisible } = useWebGLElement()

// Gate rendering on capability
const { isWebGL } = useDeviceDetection()
```

`useWebGLRect` is the lower-level primitive (`useWebGLElement` is built on it):
it returns a stable getter for an element's current transform, for reading
inside a `useFrame` loop.

## DOM-Synced Component

```tsx
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'
import { WebGLTunnel } from '@/webgl/components/tunnel'

function WebGLBox({ className }) {
  const { setRef, rect, isVisible } = useWebGLElement()
  return (
    <div ref={setRef} className={className}>
      <WebGLTunnel>
        <MyMesh rect={rect} visible={isVisible} />
      </WebGLTunnel>
    </div>
  )
}
```
