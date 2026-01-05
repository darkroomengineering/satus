# WebGL / React Three Fiber

This module provides WebGL rendering using React Three Fiber with a **lazy GlobalCanvas** architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Root Layout (app/layout.tsx)                                    │
│  └─ LazyGlobalCanvas ← Mounts only when first WebGL page visits │
│       └─ CSS visibility:hidden ← Hides when not active          │
│            └─ R3F Canvas ← Persistent WebGL context             │
│                 └─ WebGLTunnel.Out ← Renders tunneled content   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Page with WebGL (uses Wrapper webgl={true})                     │
│  └─ Canvas root={true} ← Activates GlobalCanvas                 │
│       └─ WebGLTunnel ← Portals 3D content to GlobalCanvas       │
│            └─ <My3DScene /> ← Your 3D content                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Benefits

| Feature | Description |
|---------|-------------|
| **Lazy Initialization** | GlobalCanvas only mounts when first WebGL page is visited |
| **Context Persistence** | WebGL context survives route navigation (no recreation) |
| **Seamless Transitions** | No flicker or delay when navigating between WebGL routes |
| **Shared Assets** | Textures and geometries stay loaded across routes |
| **CSS Visibility** | Uses CSS visibility:hidden + RAF pausing for zero overhead |
| **Zero Overhead** | Non-WebGL pages never trigger any WebGL code |

## Quick Start

### 1. Setup (already done in Satus)

The `LazyGlobalCanvas` is conditionally mounted via `OptionalFeatures` in `app/layout.tsx` only when WebGL is enabled:

```tsx
// app/layout.tsx
import { OptionalFeatures } from '~/lib/features'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        {/* Conditionally loads WebGL, dev tools, and GSAP based on configuration */}
        <OptionalFeatures />
      </body>
    </html>
  )
}
```

### 2. Create a WebGL Page

Use the `Wrapper` component with `webgl={true}`:

```tsx
// app/my-page/page.tsx
import { Wrapper } from '~/components/layout'
import { WebGLTunnel } from '~/webgl'

export default function MyWebGLPage() {
  return (
    <Wrapper webgl>
      <WebGLTunnel>
        <My3DScene />
      </WebGLTunnel>
      <section>HTML content overlaying 3D</section>
    </Wrapper>
  )
}

function My3DScene() {
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}
```

### 3. Create WebGL Components

Use the `WebGLTunnel` to inject 3D content and `useWebGLRect` for DOM synchronization:

```tsx
'use client'

import { useWebGLRect, WebGLTunnel } from '~/webgl'

export function WebGLBox({ className }) {
  const [setRef, rect] = useWebGLRect()

  return (
    <div ref={setRef} className={className}>
      <WebGLTunnel>
        <BoxWebGL rect={rect} />
      </WebGLTunnel>
    </div>
  )
}
```

## Components

### GlobalCanvas / LazyGlobalCanvas

The persistent WebGL canvas that lives at the layout level.

- `GlobalCanvas` - Direct component (use for testing)
- `LazyGlobalCanvas` - Dynamic import with SSR disabled (recommended)

```tsx
import { LazyGlobalCanvas } from '~/webgl'

<LazyGlobalCanvas 
  render={true}          // Enable R3F render loop
  postprocessing={false} // Enable post-processing
  alpha={true}           // Enable alpha channel
/>
```

### Canvas

Activates the GlobalCanvas for a page and provides tunnel context.

```tsx
import { Canvas } from '~/webgl'

// Using GlobalCanvas (default, recommended)
<Canvas root>
  <WebGLTunnel>
    <My3DContent />
  </WebGLTunnel>
</Canvas>

// Legacy local mode (creates canvas per page)
<Canvas root local>
  <WebGLTunnel>
    <My3DContent />
  </WebGLTunnel>
</Canvas>
```

### WebGLTunnel

Portals 3D content into the GlobalCanvas (or local canvas in legacy mode).

```tsx
import { WebGLTunnel } from '~/webgl'

<WebGLTunnel>
  <mesh>
    <boxGeometry />
    <meshBasicMaterial />
  </mesh>
</WebGLTunnel>
```

### DOMTunnel

Portals HTML content to render alongside the canvas (for overlays, etc).

```tsx
import { DOMTunnel } from '~/webgl'

<DOMTunnel>
  <div className="overlay">HTML overlay</div>
</DOMTunnel>
```

## Hooks

### useWebGLStore

Access the global WebGL state directly.

```tsx
import { useWebGLStore } from '~/webgl'

function DebugPanel() {
  const { isActivated, isActive } = useWebGLStore()
  return (
    <div>
      <p>Canvas mounted: {isActivated ? 'Yes' : 'No'}</p>
      <p>Currently active: {isActive ? 'Yes' : 'No'}</p>
    </div>
  )
}
```

### useCanvas

Access the tunnel instances from the Canvas context.

```tsx
import { useCanvas } from '~/webgl'

function MyComponent() {
  const { WebGLTunnel, DOMTunnel } = useCanvas()
  // Use tunnels directly if needed
}
```

### useWebGLRect

Track a DOM element's position/size for WebGL synchronization.

```tsx
import { useWebGLRect } from '~/webgl'

function MySyncedElement() {
  const [setRef, rect] = useWebGLRect()
  
  return (
    <div ref={setRef}>
      <WebGLTunnel>
        <mesh position={[rect.x, rect.y, 0]}>
          {/* ... */}
        </mesh>
      </WebGLTunnel>
    </div>
  )
}
```

## How Visibility Optimization Works

The GlobalCanvas uses CSS `visibility:hidden` combined with RAF (render loop) pausing:

1. **When navigating TO a WebGL page**: `isActive` becomes `true`, canvas is visible, RAF renders
2. **When navigating AWAY from WebGL**: `isActive` becomes `false`, canvas is hidden, RAF paused

When hidden:
- CSS `visibility: hidden` hides the canvas without removing it from DOM
- RAF (render loop) is paused, so no CPU cycles wasted
- WebGL context remains alive (no context loss)
- Component tree is preserved (not unmounted)
- Pointer events disabled to prevent interaction

This means:
- **No context recreation** when returning to WebGL pages
- **No unnecessary renders** when on non-WebGL pages
- **Instant reactivation** when returning
- **WebGL context preserved** (textures, geometries stay in GPU memory)

> **Note**: We use CSS visibility instead of React's Activity component because
> Activity can cause WebGL context loss during mode transitions.

## Migration from Local Canvas

If you were using the previous local canvas approach:

**Before:**
```tsx
<Wrapper webgl>
  {/* This would create a new canvas per page */}
</Wrapper>
```

**After (no code changes needed!):**
```tsx
<Wrapper webgl>
  {/* Now uses GlobalCanvas automatically */}
</Wrapper>
```

The API is backwards compatible. The only difference is the GlobalCanvas must be in your root layout (already done in Satus).

## Legacy Local Mode

If you need the old behavior for specific cases:

```tsx
<Canvas root local>
  {/* Creates a local canvas that unmounts on navigation */}
</Canvas>
```

## Troubleshooting

### WebGL content not appearing

1. Ensure `LazyGlobalCanvas` is in your root layout
2. Ensure your page uses `<Wrapper webgl>` or `<Canvas root>`
3. Check browser console for WebGL errors

### Context lost warnings

These should not happen with GlobalCanvas. If you see them:
1. Check if multiple Canvas components are mounted simultaneously
2. Ensure you're not using `local={true}` on many pages

### Performance issues on non-WebGL pages

The RAF should be paused when inactive. If you see issues:
1. Check that `isActive` is `false` when on non-WebGL pages (via `useWebGLStore`)
2. Ensure your WebGL content isn't bypassing the tunnel system
3. Verify RAF is actually paused (should not see frame updates in devtools)