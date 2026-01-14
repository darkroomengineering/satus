# WebGL / React Three Fiber

WebGL rendering with lazy GlobalCanvas architecture.

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

## Architecture

```
Root Layout → LazyGlobalCanvas (mounts on first WebGL page)
    └─ CSS visibility:hidden when inactive (RAF paused)
         └─ WebGLTunnel.Out (portals 3D content)
```

**Key benefits:**
- Lazy initialization (zero overhead until first WebGL page)
- Context persists across navigation
- Seamless route transitions
- Shared assets stay loaded

## Components

| Component | Purpose |
|-----------|---------|
| `Canvas` | Activates GlobalCanvas for a page |
| `WebGLTunnel` | Portal 3D content to GlobalCanvas |
| `DOMTunnel` | Portal HTML overlays |
| `LazyGlobalCanvas` | Persistent canvas (in layout) |

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

## Visibility Optimization

- **Active**: Canvas visible, RAF renders
- **Inactive**: CSS `visibility: hidden`, RAF paused, context preserved
