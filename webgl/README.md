# WebGL and 3D Graphics

This directory contains WebGL and 3D graphics components, utilities, and hooks for the application.

## Structure

- `components/` - Reusable WebGL and Three.js components
- `hooks/` - Custom hooks for 3D scene management and interactions
- `utils/` - Utility functions for WebGL and Three.js

## Features

- Three.js integration
- Custom WebGL shaders
- 3D scene management
- Performance optimizations
- Reusable 3D components

## Usage

The WebGL components and utilities are primarily used in conjunction with React Three Fiber (R3F) for creating interactive 3D experiences:

```typescript
import { useWebGLScene } from '~/webgl/hooks'
import { ShaderMaterial } from '~/webgl/components'
import { calculateNormals } from '~/webgl/utils'
```

## Best Practices

- Use React Three Fiber for React integration
- Implement proper cleanup in hooks
- Optimize render performance
- Handle WebGL context loss gracefully
