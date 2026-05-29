/**
 * AnimatedGradientMaterial — TSL NodeMaterial port
 *
 * Replaces the onBeforeCompile GLSL approach with MeshBasicNodeMaterial
 * so the effect compiles to WGSL on WebGPURenderer and GLSL on WebGLRenderer.
 *
 * Visual behaviour preserved:
 *  - Linear color gradient sampled from a CanvasTexture strip
 *  - FBM noise warp via mx_fractal_noise_float (replaces hand-written simplex FBM)
 *  - Optional radial falloff
 *  - Flowmap / fluid UV distortion
 *  - Downward "drip" effect with per-column speed variation
 *  - Dithered alpha edge (hash-based noise)
 */

import { Texture, Vector2 } from 'three'
import {
  clamp,
  Fn,
  float,
  hash,
  If,
  mx_fractal_noise_float,
  screenUV,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import type { TextureNode } from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import type { Flowmap } from '@/webgl/utils/flowmaps/flowmap-sim'
import type { Fluid } from '@/webgl/utils/fluid/fluid-sim'

// ---------------------------------------------------------------------------
// TSL FBM using mx_fractal_noise_float (2 octaves matches original NUM_OCTAVES 2)
// Signature: mx_fractal_noise_float(position, octaves, lacunarity, diminish, amplitude)
//
// Plain helper (not wrapped in Fn): mx_fractal_noise_float is already a TSL
// function node, so an extra Fn wrapper buys nothing and only trips Fn's
// generic inference (TS2590 "union too complex"). Each call inlines the same
// materialx node subgraph — identical result and cost.
// ---------------------------------------------------------------------------
function fbm(p: ReturnType<typeof vec3>) {
  return mx_fractal_noise_float(p, 2, 2.0, 0.5, 1.0)
}

// Shared empty texture used as a placeholder until real textures are assigned
const EMPTY_TEXTURE = new Texture()

export class AnimatedGradientMaterial extends MeshBasicNodeMaterial {
  // Scalar uniforms
  private readonly _uTime = uniform(0)
  private readonly _uAmplitude = uniform(2)
  private readonly _uFrequency = uniform(0.33)
  private readonly _uColorAmplitude = uniform(2)
  private readonly _uColorFrequency = uniform(0.33)
  private readonly _uOffset = uniform(0)
  private readonly _uQuantize = uniform(0)
  private readonly _uDrip = uniform(0.6)

  // Vector2 uniform for aspect correction — expose underlying Vector2 for direct mutation
  private readonly _uAspect = uniform(new Vector2(1, 1))

  // TextureNode references — updated via .value when textures change
  private readonly _colorsTextureNode: TextureNode
  private readonly _flowmapTextureNode: TextureNode

  // Exposed for the webgl.tsx setters that call .set(x, y) on the Vector2
  // resolution is kept as a dummy Vector2 — screenUV in TSL is renderer-aware
  readonly resolution: Vector2 = new Vector2(0, 0)
  readonly aspect: Vector2

  constructor({
    frequency = 0.33,
    amplitude = 2,
    colorAmplitude = 2,
    colorFrequency = 0.33,
    quantize = 0,
    radial = false,
    flowmap,
    drip = 0.6,
  }: {
    frequency?: number
    amplitude?: number
    colorAmplitude?: number
    colorFrequency?: number
    quantize?: number
    radial?: boolean
    flowmap?: Flowmap | Fluid
    drip?: number
  } = {}) {
    super({ transparent: true })

    this._uAmplitude.value = amplitude
    this._uFrequency.value = frequency
    this._uColorAmplitude.value = colorAmplitude
    this._uColorFrequency.value = colorFrequency
    this._uQuantize.value = quantize
    this._uOffset.value = radial ? Math.random() * 1000 : 0
    this._uDrip.value = drip

    this.aspect = this._uAspect.value as Vector2

    // Build texture nodes with placeholder; callers update .value later
    this._colorsTextureNode = texture(EMPTY_TEXTURE) as TextureNode
    this._flowmapTextureNode = texture(
      flowmap?.uniform?.value ?? EMPTY_TEXTURE
    ) as TextureNode

    this._buildNodes(!!flowmap, radial)
  }

  private _buildNodes(hasFlowmap: boolean, radial: boolean): void {
    const uTime = this._uTime
    const uAmplitude = this._uAmplitude
    const uFrequency = this._uFrequency
    const uAspect = this._uAspect
    const uColorAmplitude = this._uColorAmplitude
    const uColorFrequency = this._uColorFrequency
    const uOffset = this._uOffset
    const uQuantize = this._uQuantize
    const uDrip = this._uDrip
    const colorsTextureNode = this._colorsTextureNode
    const flowmapTextureNode = this._flowmapTextureNode

    const gradientNode = Fn(() => {
      // -----------------------------------------------------------------
      // Aspect-corrected screen-space UV (matches original vertex/fragment)
      // screenUV is 0..1; adjust for non-square viewport aspect.
      // -----------------------------------------------------------------
      const sUV = screenUV.toVar()
      sUV.addAssign(uAspect.sub(1).mul(0.5))
      sUV.divAssign(uAspect)

      // -----------------------------------------------------------------
      // Flowmap UV distortion
      // -----------------------------------------------------------------
      if (hasFlowmap) {
        const flow = flowmapTextureNode.xy.mul(0.0025)
        sUV.addAssign(flow)
      }

      // -----------------------------------------------------------------
      // Drip: per-column downward offset driven by low-frequency noise
      // -----------------------------------------------------------------
      const colPos = vec3(sUV.x.mul(1.8), 0.0, uTime.mul(0.15).add(uOffset))
      const columnVariation = fbm(colPos)
      const dripSpeed = uDrip.mul(float(0.5).add(columnVariation.mul(1.5)))
      const dripUV = vec2(sUV.x, sUV.y.sub(uTime.mul(dripSpeed))).toVar()

      // -----------------------------------------------------------------
      // Color channel FBM
      // -----------------------------------------------------------------
      const colorPos = vec3(
        dripUV.mul(uColorFrequency),
        uTime.add(uOffset).add(1000.0)
      )
      const noiseColor = clamp(fbm(colorPos).mul(uColorAmplitude), 0.0, 1.0)
      const sampledColor = colorsTextureNode.sample(vec2(0.0, noiseColor)).rgb

      // -----------------------------------------------------------------
      // Alpha channel FBM
      // -----------------------------------------------------------------
      const alphaPos = vec3(dripUV.mul(uFrequency), uTime.add(uOffset))
      let noiseAlpha = clamp(fbm(alphaPos).mul(uAmplitude), 0.0, 1.0)

      // -----------------------------------------------------------------
      // Radial falloff
      // -----------------------------------------------------------------
      if (radial) {
        const meshUV = uv()
        const radialGradient = clamp(
          smoothstep(
            0.0,
            1.0,
            float(1.0).sub(meshUV.sub(0.5).length().mul(2.0))
          ),
          0.0,
          1.0
        )
        noiseAlpha = noiseAlpha.mul(radialGradient)
      }

      // -----------------------------------------------------------------
      // Quantize
      // -----------------------------------------------------------------
      const alpha = noiseAlpha.toVar()
      If(uQuantize.greaterThan(0.0), () => {
        alpha.assign(alpha.mul(uQuantize).ceil().div(uQuantize))
      })

      // -----------------------------------------------------------------
      // Dither: subtract small hash-based noise to soften hard edges
      // -----------------------------------------------------------------
      const dither = hash(
        screenUV.x.mul(10000.0).add(screenUV.y.mul(100.0))
      ).mul(0.05)
      alpha.subAssign(dither)

      return vec4(sampledColor, alpha)
    })()

    this.colorNode = gradientNode
  }

  // -----------------------------------------------------------------------
  // Public API — identical surface to the original MeshBasicMaterial version
  // -----------------------------------------------------------------------

  // dpr is tracked by webgl.tsx but TSL's screenUV is automatically DPR-aware.
  // Keep as a no-op getter/setter so the caller doesn't need to change.
  get dpr(): number {
    return 1
  }
  set dpr(_value: number) {
    // screenUV handles pixel-ratio automatically in TSL — no-op
  }

  get time(): number {
    return this._uTime.value as number
  }
  set time(value: number) {
    this._uTime.value = value
  }

  get frequency(): number {
    return this._uFrequency.value as number
  }
  set frequency(value: number) {
    this._uFrequency.value = value
  }

  get amplitude(): number {
    return this._uAmplitude.value as number
  }
  set amplitude(value: number) {
    this._uAmplitude.value = value
  }

  set colorsTexture(value: Texture | null) {
    this._colorsTextureNode.value = value ?? EMPTY_TEXTURE
  }

  get colorAmplitude(): number {
    return this._uColorAmplitude.value as number
  }
  set colorAmplitude(value: number) {
    this._uColorAmplitude.value = value
  }

  get colorFrequency(): number {
    return this._uColorFrequency.value as number
  }
  set colorFrequency(value: number) {
    this._uColorFrequency.value = value
  }

  get quantize(): number {
    return this._uQuantize.value as number
  }
  set quantize(value: number) {
    this._uQuantize.value = value
  }

  get drip(): number {
    return this._uDrip.value as number
  }
  set drip(value: number) {
    this._uDrip.value = value
  }
}
