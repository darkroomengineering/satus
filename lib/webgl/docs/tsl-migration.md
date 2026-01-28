# TSL (Three Shader Language) Migration Guide

TSL is Three.js's new shader language that compiles to both WGSL (WebGPU) and GLSL (WebGL). This guide covers when and how to migrate from traditional GLSL shaders to TSL.

## What is TSL?

TSL (Three Shader Language) is a node-based shader system built into Three.js that:

- **Compiles to both WGSL and GLSL** automatically based on the renderer
- **Works with both WebGPU and WebGL** renderers
- **Provides type-safe shader composition** in TypeScript
- **Includes built-in utilities** for common operations (noise, math, etc.)

## When to Migrate

### Keep Using GLSL When:

- Your existing shaders work and WebGL is sufficient
- You need precise control over shader compilation
- You're using custom shader chunks or `onBeforeCompile` patterns that work well
- Performance profiling shows no benefit from WebGPU

### Migrate to TSL When:

- You need **WebGPU-specific features** (compute shaders, storage textures)
- You want **unified shaders** that work across both renderers
- You're building **new materials** from scratch
- You want to use **MaterialX noise functions** instead of custom implementations
- You need **better shader composability** without string concatenation

## Basic Concepts

### Traditional GLSL (Current Pattern)

```typescript
// Using RawShaderMaterial with GLSL strings
import { RawShaderMaterial, GLSL3 } from 'three'

const material = new RawShaderMaterial({
  glslVersion: GLSL3,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new Color('#ff0000') },
  },
  vertexShader: /* glsl */ `
    precision highp float;
    in vec3 position;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec3 uColor;
    out vec4 fragColor;
    void main() {
      fragColor = vec4(uColor, 1.0);
    }
  `,
})
```

### TSL Approach (Node Materials)

```typescript
// Using TSL node materials
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { uniform, color } from 'three/tsl'

const timeUniform = uniform(0)
const colorUniform = uniform(color('#ff0000'))

const material = new MeshBasicNodeMaterial()
material.colorNode = colorUniform
```

## TSL Node Types

### Core Nodes

```typescript
import {
  // Uniforms
  uniform,       // Create shader uniforms

  // Constants
  float,         // Float constant
  int,           // Integer constant
  vec2,          // Vector2 constant
  vec3,          // Vector3 constant
  vec4,          // Vector4 constant
  color,         // Color constant (converts to vec3)

  // Time
  time,          // Global time (seconds since start)

  // Math
  sin, cos, tan,
  abs, floor, ceil, fract,
  min, max, clamp,
  mix, smoothstep, step,
  length, distance, normalize, dot, cross,
  pow, sqrt, exp, log,

  // Texture
  texture,       // Sample a texture
  uv,            // UV coordinates

  // Position/Normal
  positionLocal,
  positionWorld,
  normalLocal,
  normalWorld,
} from 'three/tsl'
```

### Node Material Types

Node materials are imported from the `three/webgpu` module:

```typescript
import {
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  MeshPhysicalNodeMaterial,
  PointsNodeMaterial,
  LineBasicNodeMaterial,
  SpriteNodeMaterial,
} from 'three/webgpu'
```

## Comparison Examples

### Example 1: Animated Color

**GLSL Approach:**

```typescript
import { NOISE } from '@/lib/webgl/utils/noise'

const material = new ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
      vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), pulse);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
})

// In animation loop:
material.uniforms.uTime.value = elapsed
```

**TSL Approach:**

```typescript
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { time, sin, mix, vec3 } from 'three/tsl'

const material = new MeshBasicNodeMaterial()

const pulse = sin(time.mul(2.0)).mul(0.5).add(0.5)
const colorA = vec3(1.0, 0.0, 0.0)
const colorB = vec3(0.0, 0.0, 1.0)

material.colorNode = mix(colorA, colorB, pulse)

// No manual uniform updates needed - time updates automatically
```

### Example 2: Noise-Based Displacement

**GLSL Approach:**

```typescript
import { NOISE } from '@/lib/webgl/utils/noise'

const vertexShader = /* glsl */ `
  ${NOISE.SIMPLEX_3D}

  uniform float uTime;
  uniform float uAmplitude;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float noise = simplex_3d(pos + uTime * 0.5);
    pos += normal * noise * uAmplitude;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`
```

**TSL Approach:**

```typescript
import { MeshStandardNodeMaterial } from 'three/webgpu'
import {
  positionLocal,
  normalLocal,
  time,
  uniform,
  mx_noise_float,
} from 'three/tsl'

const amplitude = uniform(0.5)
const material = new MeshStandardNodeMaterial()

// MaterialX noise - no custom GLSL needed
const noise = mx_noise_float(positionLocal.add(time.mul(0.5)))
const displacement = normalLocal.mul(noise).mul(amplitude)

material.positionNode = positionLocal.add(displacement)
```

## MaterialX Noise Functions

TSL includes MaterialX standard library noise functions:

```typescript
import {
  // Basic noise
  mx_noise_float,        // 3D Perlin noise (float output)
  mx_noise_vec3,         // 3D Perlin noise (vec3 output)
  mx_noise_vec4,         // 3D Perlin noise (vec4 output)

  // Fractal noise (FBM)
  mx_fractal_noise_float,
  mx_fractal_noise_vec3,
  mx_fractal_noise_vec4,

  // Cell/Worley noise
  mx_cell_noise_float,

  // Voronoi
  mx_worley_noise_float,
  mx_worley_noise_vec2,
  mx_worley_noise_vec3,
} from 'three/tsl'
```

### Noise Comparison

**Custom GLSL (current pattern in `/lib/webgl/utils/noise.ts`):**

```typescript
const fragmentShader = /* glsl */ `
  ${NOISE.SIMPLEX_3D}
  ${NOISE.FBM_3D(5)}

  void main() {
    float n = fbm(vPosition * 2.0);
    gl_FragColor = vec4(vec3(n), 1.0);
  }
`
```

**TSL with MaterialX:**

```typescript
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { positionLocal, mx_fractal_noise_float, vec3 } from 'three/tsl'

const material = new MeshBasicNodeMaterial()

// 5 octaves of fractal noise
const noise = mx_fractal_noise_float(
  positionLocal.mul(2.0),  // amplitude
  5,                        // octaves
  2.0,                      // lacunarity
  0.5                       // diminish
)

material.colorNode = vec3(noise, noise, noise)
```

## Migrating onBeforeCompile Patterns

If you're using `onBeforeCompile` to inject shader code:

**Before (GLSL injection):**

```typescript
const material = new MeshStandardMaterial()

material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    transformed += normal * sin(uTime + position.x) * 0.1;
    `
  )
}
```

**After (TSL):**

```typescript
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { positionLocal, normalLocal, time, sin } from 'three/tsl'

const material = new MeshStandardNodeMaterial()

const wave = sin(time.add(positionLocal.x)).mul(0.1)
material.positionNode = positionLocal.add(normalLocal.mul(wave))
```

## Best Practices

### 1. Start Simple

Begin with basic materials before complex effects:

```typescript
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { vec3, mix, sin, time } from 'three/tsl'

// Start here
const material = new MeshBasicNodeMaterial()
material.colorNode = vec3(1, 0, 0)

// Then add complexity
material.colorNode = mix(colorA, colorB, sin(time))
```

### 2. Use uniform() for Animatable Values

```typescript
import { uniform, vec2 } from 'three/tsl'

// Values you'll update at runtime
const progress = uniform(0)
const mousePos = uniform(vec2(0, 0))

// Update in animation loop
progress.value = newProgress
mousePos.value.set(x, y)
```

### 3. Compose Nodes Logically

```typescript
import { color, mx_noise_float, sin, time, mix, vec3, positionLocal } from 'three/tsl'

// Build up complex effects from simple parts
const baseColor = color('#ff0000')
const noise = mx_noise_float(positionLocal)
const animated = sin(time).mul(0.5).add(0.5)

material.colorNode = mix(baseColor, vec3(noise), animated)
```

### 4. Type-Safe Development

TSL nodes are typed, providing better IDE support than GLSL strings:

```typescript
import { vec3 } from 'three/tsl'

// TypeScript knows these operations are valid
const a = vec3(1, 0, 0)
const b = vec3(0, 1, 0)
const result = a.add(b).normalize().mul(0.5)
```

## Using the Satus TSL Utilities

The Satus starter includes pre-built TSL utilities in `@/lib/webgl/utils/tsl`:

```typescript
import {
  createAnimatedColorMaterial,
  createNoiseMaterial,
  createTSLTextureMaterial,
  createPerlinNoiseNode,
  createFBMNoiseNode,
} from '@/lib/webgl/utils/tsl'

// Animated color material
const { material, speedUniform } = createAnimatedColorMaterial({
  colorA: '#ff0000',
  colorB: '#0000ff',
  speed: 2.0,
})

// Noise-based material
const { material: noiseMat } = createNoiseMaterial({
  baseColor: '#3366ff',
  scale: 2.0,
  octaves: 4,
})

// Textured material with UV manipulation
const texMat = createTSLTextureMaterial({
  texture: myTexture,
  tint: '#ffddcc',
  uvScale: 2.0,
})
```

## Resources

- [Three.js TSL Documentation](https://threejs.org/docs/#api/en/materials/nodes/NodeMaterial)
- [Three.js Examples - WebGPU](https://threejs.org/examples/?q=webgpu)
- [MaterialX Specification](https://materialx.org/)

## Notes

- TSL is evolving rapidly with Three.js development
- Not all GLSL patterns have direct TSL equivalents yet
- For performance-critical code, benchmark both approaches
- TSL adds some overhead for simple shaders due to node graph compilation
- Node materials require the WebGPU renderer or a compatible WebGL renderer
