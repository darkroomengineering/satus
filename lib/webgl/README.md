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

## Renderer Selection

Automatic fallback chain:
1. **WebGPU** - Modern API with best performance (Chrome 113+, Edge 113+)
2. **WebGL 2** - Wide browser support
3. **WebGL 1** - Legacy fallback
4. **Disabled** - Graceful degradation if no GPU

In development, a badge shows the active renderer: `🚀 WebGPU` or `🎮 WebGL`

## Architecture

```
<Canvas root> (layout OR per-page Wrapper) → rendered only on WebGL devices
    └─ WebGLTunnel.Out (portals 3D content from any page)
```

**Key benefits (shared/layout strategy):**
- Context persists across navigation (no recreation)
- Seamless route transitions
- Shared assets stay loaded
- No-op on non-WebGL devices
- WebGPU when available, WebGL fallback

## Components

| Component | Purpose |
|-----------|---------|
| `Canvas` | Mounts the canvas via `root` (layout or per-page Wrapper) |
| `WebGLTunnel` | Portal 3D content into the canvas |
| `DOMTunnel` | Portal HTML overlays |

## Hooks

```tsx
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'
import { useWebGLStore } from '@/webgl/store'

// Track DOM element for WebGL sync
const [setRef, rect] = useWebGLRect()

// Access global state
const { isActivated, isActive } = useWebGLStore()
```

## DOM-Synced Component

```tsx
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'
import { WebGLTunnel } from '@/webgl/components/tunnel'

function WebGLBox({ className }) {
  const [setRef, rect] = useWebGLRect()
  return (
    <div ref={setRef} className={className}>
      <WebGLTunnel>
        <mesh position={[rect.x, rect.y, 0]} />
      </WebGLTunnel>
    </div>
  )
}
```

## GPU Detection

```tsx
import { useDeviceDetection } from '@/hooks/use-device-detection'

function MyComponent() {
  const { hasGPU, hasWebGPU, hasWebGL, gpuCapability } = useDeviceDetection()

  if (!hasGPU) {
    return <FallbackUI />
  }

  // gpuCapability.preferredRenderer: 'webgpu' | 'webgl2' | 'webgl1' | 'none'
}
```

## Visibility Optimization

- **Active**: Canvas visible, RAF renders
- **Inactive**: CSS `visibility: hidden`, RAF paused, GPU context preserved
