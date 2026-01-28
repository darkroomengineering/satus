/**
 * TSL (Three Shader Language) Utilities
 *
 * TSL is Three.js's node-based shader system that compiles to both WGSL (WebGPU)
 * and GLSL (WebGL) automatically. These utilities provide common patterns and
 * factory functions for TSL-based materials.
 *
 * EXPERIMENTAL: TSL is relatively new and APIs may change with Three.js updates.
 *
 * @see /lib/webgl/docs/tsl-migration.md for migration guide
 *
 * @example
 * ```tsx
 * import { createAnimatedColorMaterial, createNoiseMaterial } from '@/lib/webgl/utils/tsl'
 *
 * const material = createAnimatedColorMaterial({
 *   colorA: '#ff0000',
 *   colorB: '#0000ff',
 *   speed: 2.0,
 * })
 * ```
 */

import {
  Color,
  type ColorRepresentation,
  type Texture,
  type Vector2,
} from 'three'
import {
  color,
  float,
  mix,
  mx_fractal_noise_float,
  mx_noise_float,
  positionLocal,
  sin,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl'
import type { Node } from 'three/webgpu'
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/**
 * Options for creating an animated color material
 */
export interface AnimatedColorMaterialOptions {
  /** Starting color (default: #ff0000) */
  colorA?: ColorRepresentation
  /** Ending color (default: #0000ff) */
  colorB?: ColorRepresentation
  /** Animation speed multiplier (default: 1.0) */
  speed?: number
  /** Initial time offset (default: 0) */
  timeOffset?: number
}

/**
 * Options for creating a noise-based material
 */
export interface NoiseMaterialOptions {
  /** Base color to mix with noise (default: #ffffff) */
  baseColor?: ColorRepresentation
  /** Noise scale/frequency (default: 1.0) */
  scale?: number
  /** Animation speed (default: 0.5) */
  speed?: number
  /** Number of octaves for fractal noise (default: 5) */
  octaves?: number
  /** Lacunarity for fractal noise (default: 2.0) */
  lacunarity?: number
  /** Diminish factor for fractal noise (default: 0.5) */
  diminish?: number
}

/**
 * Options for creating a textured material with TSL
 */
export interface TSLTextureMaterialOptions {
  /** The texture to apply */
  texture: Texture
  /** Tint color to multiply with texture (default: #ffffff) */
  tint?: ColorRepresentation
  /** UV scale (default: 1.0) */
  uvScale?: number | Vector2
  /** UV offset (default: 0.0) */
  uvOffset?: number | Vector2
}

/**
 * Handle returned from animated materials for runtime control
 */
export interface AnimatedMaterialHandle {
  /** The created material */
  material: MeshBasicNodeMaterial
  /** Uniform for animation speed - set value property to change */
  speedUniform: { value: number }
  /** Uniform for time offset - set value property to change */
  timeOffsetUniform: { value: number }
}

/**
 * Handle returned from noise materials for runtime control
 */
export interface NoiseMaterialHandle {
  /** The created material */
  material: MeshStandardNodeMaterial
  /** Uniform for noise scale */
  scaleUniform: { value: number }
  /** Uniform for animation speed */
  speedUniform: { value: number }
}

// ----------------------------------------------------------------------------
// Material Factories
// ----------------------------------------------------------------------------

/**
 * Creates a MeshBasicNodeMaterial that animates between two colors over time.
 *
 * Uses the global time node for automatic time updates - no manual uniform updates needed.
 *
 * @example
 * ```tsx
 * const { material, speedUniform } = createAnimatedColorMaterial({
 *   colorA: '#ff0000',
 *   colorB: '#00ff00',
 *   speed: 2.0,
 * })
 *
 * // Later, change speed at runtime
 * speedUniform.value = 4.0
 *
 * return <mesh material={material}><boxGeometry /></mesh>
 * ```
 */
export function createAnimatedColorMaterial(
  options: AnimatedColorMaterialOptions = {}
): AnimatedMaterialHandle {
  const {
    colorA = '#ff0000',
    colorB = '#0000ff',
    speed = 1.0,
    timeOffset = 0,
  } = options

  // Create uniforms that can be updated at runtime
  const speedUniform = uniform(speed)
  const timeOffsetUniform = uniform(timeOffset)

  // Create the material
  const material = new MeshBasicNodeMaterial()

  // Build the color animation node graph
  // pulse = sin((time + offset) * speed) * 0.5 + 0.5  (maps to 0-1 range)
  const animTime = time.add(timeOffsetUniform)
  const pulse = sin(animTime.mul(speedUniform)).mul(0.5).add(0.5)

  // Mix between the two colors based on pulse
  const colorNodeA = color(new Color(colorA))
  const colorNodeB = color(new Color(colorB))
  material.colorNode = mix(colorNodeA, colorNodeB, pulse)

  return {
    material,
    speedUniform: speedUniform as unknown as { value: number },
    timeOffsetUniform: timeOffsetUniform as unknown as { value: number },
  }
}

/**
 * Creates a MeshStandardNodeMaterial with animated noise-based color.
 *
 * Uses MaterialX noise functions which are built into TSL and work on both
 * WebGPU and WebGL renderers.
 *
 * @example
 * ```tsx
 * const { material, scaleUniform } = createNoiseMaterial({
 *   baseColor: '#3366ff',
 *   scale: 2.0,
 *   octaves: 4,
 * })
 *
 * // Adjust noise scale at runtime
 * scaleUniform.value = 3.0
 *
 * return <mesh material={material}><sphereGeometry /></mesh>
 * ```
 */
export function createNoiseMaterial(
  options: NoiseMaterialOptions = {}
): NoiseMaterialHandle {
  const {
    baseColor = '#ffffff',
    scale = 1.0,
    speed = 0.5,
    octaves = 5,
    lacunarity = 2.0,
    diminish = 0.5,
  } = options

  // Create uniforms
  const scaleUniform = uniform(scale)
  const speedUniform = uniform(speed)

  // Create the material
  const material = new MeshStandardNodeMaterial()

  // Animated position for noise input
  const animatedPosition = positionLocal.add(vec3(time.mul(speedUniform), 0, 0))
  const scaledPosition = animatedPosition.mul(scaleUniform)

  // Use MaterialX fractal noise for organic appearance
  const noise = mx_fractal_noise_float(
    scaledPosition,
    float(octaves),
    float(lacunarity),
    float(diminish)
  )

  // Remap noise from [-1, 1] to [0, 1]
  const normalizedNoise = noise.mul(0.5).add(0.5)

  // Mix base color with noise
  const baseColorNode = color(new Color(baseColor))
  material.colorNode = baseColorNode.mul(normalizedNoise.add(0.5))

  return {
    material,
    scaleUniform: scaleUniform as unknown as { value: number },
    speedUniform: speedUniform as unknown as { value: number },
  }
}

/**
 * Creates a simple textured MeshBasicNodeMaterial using TSL.
 *
 * Demonstrates the TSL approach to texture sampling with UV manipulation.
 *
 * @example
 * ```tsx
 * import { useTextureCached } from '@/lib/webgl'
 *
 * const tex = useTextureCached('/hero.jpg')
 * if (!tex) return null
 *
 * const material = createTSLTextureMaterial({
 *   texture: tex,
 *   tint: '#ffddcc',
 *   uvScale: 2.0,
 * })
 *
 * return <mesh material={material}><planeGeometry /></mesh>
 * ```
 */
export function createTSLTextureMaterial(
  options: TSLTextureMaterialOptions
): MeshBasicNodeMaterial {
  const {
    texture: tex,
    tint = '#ffffff',
    uvScale = 1.0,
    uvOffset = 0.0,
  } = options

  const material = new MeshBasicNodeMaterial()

  // Build UV transformation
  const scaleVec =
    typeof uvScale === 'number'
      ? vec2(uvScale, uvScale)
      : vec2(uvScale.x, uvScale.y)
  const offsetVec =
    typeof uvOffset === 'number'
      ? vec2(uvOffset, uvOffset)
      : vec2(uvOffset.x, uvOffset.y)

  const transformedUv = uv().mul(scaleVec).add(offsetVec)

  // Sample texture with transformed UVs
  const textureSample = texture(tex, transformedUv)

  // Apply tint
  const tintColor = color(new Color(tint))
  material.colorNode = textureSample.mul(tintColor)

  return material
}

// ----------------------------------------------------------------------------
// Noise Utilities (TSL equivalents of /lib/webgl/utils/noise.ts)
// ----------------------------------------------------------------------------

/**
 * Creates a simple Perlin noise node.
 *
 * TSL equivalent of the GLSL perlin_3d function in noise.ts.
 * Uses MaterialX mx_noise_float which is built into Three.js.
 *
 * @example
 * ```tsx
 * import { createPerlinNoiseNode } from '@/lib/webgl/utils/tsl'
 * import { positionLocal } from 'three/tsl'
 *
 * const noise = createPerlinNoiseNode(positionLocal.mul(2.0))
 * material.colorNode = vec3(noise, noise, noise)
 * ```
 */
export function createPerlinNoiseNode(position: Node): Node {
  return mx_noise_float(position)
}

/**
 * Creates a fractal Brownian motion (FBM) noise node.
 *
 * TSL equivalent of the GLSL fbm function in noise.ts.
 * Uses MaterialX mx_fractal_noise_float which handles octave accumulation.
 *
 * @param position - The position to sample noise at
 * @param octaves - Number of noise octaves (default: 5)
 * @param lacunarity - Frequency multiplier per octave (default: 2.0)
 * @param diminish - Amplitude multiplier per octave (default: 0.5)
 *
 * @example
 * ```tsx
 * import { createFBMNoiseNode } from '@/lib/webgl/utils/tsl'
 * import { positionLocal, time, vec3 } from 'three/tsl'
 *
 * const animatedPos = positionLocal.add(vec3(time, 0, 0))
 * const noise = createFBMNoiseNode(animatedPos, 6)
 * ```
 */
export function createFBMNoiseNode(
  position: Node,
  octaves = 5,
  lacunarity = 2.0,
  diminish = 0.5
): Node {
  return mx_fractal_noise_float(
    position,
    float(octaves),
    float(lacunarity),
    float(diminish)
  )
}

// ----------------------------------------------------------------------------
// Re-exports for convenience
// ----------------------------------------------------------------------------

/**
 * Re-export commonly used TSL functions for convenience.
 *
 * Users can also import directly from 'three/tsl' for the full API.
 */
export {
  // Core
  color,
  float,
  // Math
  mix,
  // Noise
  mx_fractal_noise_float,
  mx_noise_float,
  // Position
  positionLocal,
  sin,
  // Texture
  texture,
  // Time
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl'

// Re-export materials from webgpu module
export { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu'
