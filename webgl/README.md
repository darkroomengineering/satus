# WebGL

WebGL and 3D graphics components built on Three.js and React Three Fiber.

## Structure

**Components**
- `canvas/` - Main Three.js canvas and scene setup
- `flowmap-provider/` - Fluid simulations and flow effects
- `image/` - WebGL-enhanced images (wraps `~/components/image`)
- `postprocessing/` - Post-processing effects and shaders
- `preload/` - Asset preloading utilities
- `raf/` - RequestAnimationFrame management
- `tunnel/` - Portal system for WebGL context

**Hooks**
- `use-webgl-rect.ts` - WebGL rectangle positioning

**Utils**
- `blend.ts` - Blending mode utilities
- `flowmaps/` - Fluid flow simulation
- `fluid/` - Fluid dynamics utilities
- `functions.ts` - WebGL helper functions
- `noise.ts` - Noise generation
- `program.ts` - WebGL program utilities

## Usage

```tsx
import { Canvas } from '~/webgl/components/canvas'
import { Image } from '~/webgl/components/image'

// Basic setup
export default function Scene() {
  return (
    <Canvas postprocessing>
      <Image src="/texture.jpg" />
    </Canvas>
  )
}

// With wrapper component
import { Wrapper } from '~/app/(pages)/(components)/wrapper'

export default function Page() {
  return (
    <Wrapper webgl={{ postprocessing: true }}>
      {/* Your content */}
    </Wrapper>
  )
}
```

## Core Technologies

- **Three.js** - 3D WebGL library
- **React Three Fiber** - React renderer for Three.js
- **Drei** - Useful R3F helpers
- **Postprocessing** - Effects pipeline

## Features

- High-performance WebGL rendering
- Custom shaders and materials
- Flow map animations
- Post-processing effects
- Responsive 3D scenes
- Mobile optimizations

## Best Practices

- **Images**: Use `~/webgl/components/image` in WebGL contexts (not `~/components/image`)
- **Performance**: Enable postprocessing only when needed
- **Mobile**: Test performance on mobile devices
- **Shaders**: Use GLSL files for complex shaders
