# WebGL / WebGPU / React Three Fiber

GPU-accelerated 3D rendering with lazy GlobalCanvas architecture.

## Quick Start

```tsx
import { Wrapper } from '@/components/layout'
import { WebGLTunnel } from '@/webgl/components/tunnel'

export default function Page() {
  return (
    <Wrapper webgl>
      <WebGLTunnel>
        <My3DScene />
      </WebGLTunnel>
      <section>HTML overlay</section>
    </Wrapper>
  )
}
```

No configuration needed - just add `webgl` prop to enable 3D on any page.

## Renderer Selection

Automatic fallback chain:
1. **WebGPU** - Modern API with best performance (Chrome 113+, Edge 113+)
2. **WebGL 2** - Wide browser support
3. **WebGL 1** - Legacy fallback
4. **Disabled** - Graceful degradation if no GPU

In development, a badge shows the active renderer: `🚀 WebGPU` or `🎮 WebGL`

## Architecture

```
Root Layout → GlobalCanvas (mounts on first webgl page visit)
    └─ CSS visibility:hidden when inactive (RAF paused)
         └─ WebGLTunnel.Out (portals 3D content)
```

**Key benefits:**
- Zero overhead until first WebGL page
- Context persists across navigation (no recreation)
- Seamless route transitions
- Shared assets stay loaded
- WebGPU when available, WebGL fallback

## Components

| Component | Purpose |
|-----------|---------|
| `Canvas` | Activates GlobalCanvas for a page |
| `WebGLTunnel` | Portal 3D content to GlobalCanvas |
| `DOMTunnel` | Portal HTML overlays |
| `GlobalCanvas` | Persistent canvas (in layout) |

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
