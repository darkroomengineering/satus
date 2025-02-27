# WebGL and 3D Graphics

This directory contains WebGL and 3D graphics components, utilities, and hooks for the application. Built on Three.js and React Three Fiber, it provides tools for creating interactive 3D experiences and visual effects.

## Structure

- `components/` - Reusable WebGL and Three.js components
  - `canvas/` - Main Three.js canvas and scene setup
  - `flowmap/` - Fluid simulations and flow effects
  - `image/` - WebGL-enhanced image components
  - `postprocessing/` - Post-processing effects and shaders
  - `preload/` - Asset preloading utilities
  - `raf/` - RequestAnimationFrame management
  - `tunnel/` - Portal system for WebGL context
- `hooks/` - Custom hooks for 3D scene management
  - `use-texture.ts` - Hooks for texture loading and management
  - `use-webgl-rect.ts` - Hooks for WebGL rectangle positioning
- `utils/` - Utility functions
  - `blend.ts` - Blending mode utilities
  - `flowmap.ts` - Fluid flow simulation utilities
  - `noise.ts` - Noise generation functions
  - `program.ts` - WebGL program utilities

## Core Technologies

- [Three.js 0.174.0](https://threejs.org/) - 3D WebGL library
- [React Three Fiber 9.0](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
- [Drei 10.0](https://github.com/pmndrs/drei) - Useful helpers for R3F
- [Postprocessing 6.36](https://pmndrs.github.io/postprocessing) - Post-processing effects

## Features

- High-performance WebGL rendering
- Custom shaders and materials
- Flow map animations and fluid simulations
- Texture loading and management
- Post-processing effects
- Responsive 3D scenes
- Performance optimizations for mobile

## Usage Examples

### Basic Canvas Setup

```tsx
import { Canvas } from '~/webgl/components/canvas'

export default function Scene() {
  return (
    <Canvas>
      <mesh>
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
    </Canvas>
  )
}
```

### Animated Gradient with Flow

```tsx
import { FlowMap } from '~/webgl/components/flowmap'
import { useTexture } from '~/webgl/hooks/use-texture'

export default function AnimatedGradient() {
  const texture = useTexture('/textures/gradient.jpg')
  
  return (
    <Canvas>
      <FlowMap
        texture={texture}
        viscosity={0.5}
        speed={0.5}
        falloff={0.8}
      />
    </Canvas>
  )
}
```

### Image with WebGL Effects

```tsx
import { WebGLImage } from '~/webgl/components/image'

export default function EnhancedImage() {
  return (
    <WebGLImage
      src="/images/photo.jpg"
      alt="Enhanced image"
      effect="distortion"
      intensity={0.3}
    />
  )
}
```

## Best Practices

1. **Performance**
   - Use instance meshes for repeated geometry
   - Implement proper cleanup in hooks
   - Use appropriate level of detail for different devices
   - Optimize texture sizes and formats

2. **Architecture**
   - Separate rendering logic from business logic
   - Use React Three Fiber for React integration
   - Implement proper error boundaries for WebGL contexts
   - Handle WebGL context loss gracefully

3. **Compatibility**
   - Include fallbacks for devices without WebGL support
   - Use progressive enhancement
   - Test on various devices and browsers
   - Consider power consumption on mobile devices
