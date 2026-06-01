/**
 * LiquidDripMaterial — TSL 2D screen-space dripping liquid metal
 *
 * A fullscreen 2D curtain renderer — glossy red liquid metal that hangs from
 * the top of the hero and drips downward in organic tendrils, clipped to the
 * first fold (overflow:hidden on the hero section).
 *
 * Architecture mirrors AnimatedGradientMaterial exactly:
 *  - MeshBasicNodeMaterial subclass { transparent: true }
 *  - Uniforms exposed as typed getters/setters
 *  - colorNode built via TSL Fn()
 *
 * 2D field approach:
 *  - Dripping curtain: metal hangs from top, per-column lower boundary b(x,t)
 *  - 5 animated drip tendrils with Gaussian protrusions that slowly oscillate
 *  - Fractal noise on boundary for organic wobble
 *  - Coverage: smoothstep around boundary → 1 (metal) / 0 (transparent)
 *  - Faux normal from 2 finite-difference taps in x and y
 *  - Shading: red-chrome metallic — Fresnel + Blinn-Phong + env gradient
 *
 * Public API (mirrors AnimatedGradientMaterial):
 *  time, amplitude, dpr (no-op), aspect (Vector2), resolution (Vector2)
 */

import { Vector2 } from 'three'
import {
  clamp,
  cos,
  dot,
  exp,
  Fn,
  float,
  max,
  mix,
  mx_fractal_noise_float,
  normalize,
  pow,
  screenUV,
  sin,
  smoothstep,
  sqrt,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import type { Node } from 'three/webgpu'
import { MeshBasicNodeMaterial } from 'three/webgpu'

// Convenience alias: a float-typed TSL node with full arithmetic method chaining
type FloatNode = Node<'float'>

// Vec3Node: derive the concrete type once via type-query so casts stay simple.
const _v3sample = vec3(0, 0, 0)
type Vec3Node = typeof _v3sample

export class LiquidDripMaterial extends MeshBasicNodeMaterial {
  private readonly _uTime = uniform(0)
  private readonly _uAmplitude = uniform(1.0)

  // Exposed for webgl.tsx API compatibility (aspect.set(x,y), resolution.set(x,y))
  // The drip field works in raw 0..1 UV space so aspect is not used in the shader.
  readonly aspect: Vector2 = new Vector2(1, 1)
  readonly resolution: Vector2 = new Vector2(0, 0)

  constructor({ amplitude = 1.0 }: { amplitude?: number } = {}) {
    super({ transparent: true })
    this._uAmplitude.value = amplitude
    this._buildNodes()
  }

  private _buildNodes(): void {
    const uTime = this._uTime

    // ------------------------------------------------------------------
    // Helper: organic boundary noise — slow fractal noise on x-axis
    // Low-frequency fractal noise (2 octaves) for wobbly-edge drift.
    // ------------------------------------------------------------------
    const noiseEdge = (sx: FloatNode): FloatNode => {
      return mx_fractal_noise_float(
        vec3(sx.mul(1.8), uTime.mul(0.09), float(3.7)),
        2,
        2.0,
        0.5,
        1.0
      ) as unknown as FloatNode
    }

    // ------------------------------------------------------------------
    // Helper: Gaussian drip tendril contribution at column sx.
    // cx = drip center x (0..1), w = width, depth = how far it drips down.
    // Returns value in ~0..depth range (bell-shaped around cx).
    // NOT Fn-wrapped — plain JS helper to avoid TS2590.
    // ------------------------------------------------------------------
    const dripTendril = (
      sx: FloatNode,
      cx: number,
      w: number,
      depth: FloatNode
    ): FloatNode => {
      const diff = sx.sub(cx) as unknown as FloatNode
      // Gaussian: exp(-diff²/w²)
      const exponent = diff
        .mul(diff)
        .div(w * w)
        .mul(-1.0) as unknown as FloatNode
      const bell = exp(exponent) as unknown as FloatNode
      return bell.mul(depth) as unknown as FloatNode
    }

    // ------------------------------------------------------------------
    // Drip boundary Y — the lower edge of the metal curtain.
    // sy: 1=top, 0=bottom in WebGL screenUV convention.
    // "Inside metal" = sy > boundaryY(sx).
    // Base coverage: metal fills top ~35% (boundaryY ≈ 0.65).
    // Drip tendrils push boundaryY lower → tendrils reach toward y≈0.
    // ------------------------------------------------------------------
    const boundaryY = (sx: FloatNode): FloatNode => {
      const base = float(0.65)

      // Organic wobble: ±0.04 along the edge
      const wobble = noiseEdge(sx).mul(0.04) as unknown as FloatNode

      // Tendril 1 — left-center, deep
      const d1len = sin(uTime.mul(0.31))
        .mul(0.15)
        .add(0.32) as unknown as FloatNode
      const d1 = dripTendril(sx, 0.28, 0.065, d1len)

      // Tendril 2 — center, deepest
      const d2len = sin(uTime.mul(0.23).add(1.9))
        .mul(0.18)
        .add(0.38) as unknown as FloatNode
      const d2 = dripTendril(sx, 0.52, 0.055, d2len)

      // Tendril 3 — right-center
      const d3len = sin(uTime.mul(0.41).add(3.3))
        .mul(0.12)
        .add(0.25) as unknown as FloatNode
      const d3 = dripTendril(sx, 0.74, 0.06, d3len)

      // Tendril 4 — far left, narrow
      const d4len = sin(uTime.mul(0.19).add(5.1))
        .mul(0.1)
        .add(0.18) as unknown as FloatNode
      const d4 = dripTendril(sx, 0.12, 0.04, d4len)

      // Tendril 5 — far right
      const d5len = cos(uTime.mul(0.27).add(0.8))
        .mul(0.13)
        .add(0.22) as unknown as FloatNode
      const d5 = dripTendril(sx, 0.88, 0.05, d5len)

      // Subtracting drip depth from base → tendrils reach downward
      return base
        .sub(wobble)
        .sub(d1)
        .sub(d2)
        .sub(d3)
        .sub(d4)
        .sub(d5) as unknown as FloatNode
    }

    // ------------------------------------------------------------------
    // Coverage field: 1 = inside metal (above boundary), 0 = transparent.
    // E = edge softness — small for a crisp-but-liquid drip edge.
    // ------------------------------------------------------------------
    const coverageAt = (sx: FloatNode, sy: FloatNode): FloatNode => {
      const bY = boundaryY(sx)
      const E = float(0.018)
      return smoothstep(bY.sub(E), bY.add(E), sy) as unknown as FloatNode
    }

    // ------------------------------------------------------------------
    // Red-chrome metallic shading — plain JS helper (NOT Fn-wrapped).
    // Given coverage + screen coords, returns litColor + alpha.
    // Copied from the approved LiquidMetalMaterial shading block.
    // ------------------------------------------------------------------
    const shadeDrip = (
      coverage: FloatNode,
      sx: FloatNode,
      sy: FloatNode
    ): { litColor: Vec3Node; alpha: FloatNode } => {
      // Faux normal from central-difference gradient (2 extra field evals)
      const H = 0.025
      const fieldPx = coverageAt(sx.add(H) as unknown as FloatNode, sy)
      const fieldMx = coverageAt(sx.sub(H) as unknown as FloatNode, sy)
      const fieldPy = coverageAt(sx, sy.add(H) as unknown as FloatNode)
      const fieldMy = coverageAt(sx, sy.sub(H) as unknown as FloatNode)

      // Gradient: points toward the higher-coverage (metal interior) region
      const gx = fieldPx.sub(fieldMx) as unknown as FloatNode
      const gy = fieldPy.sub(fieldMy) as unknown as FloatNode

      // Bend tangentially (0.45 gives metallic curvature at the drip edge)
      const BEND = float(0.45)
      const nxRaw = gx.mul(BEND) as unknown as FloatNode
      const nyRaw = gy.mul(BEND) as unknown as FloatNode

      // nz from unit-sphere constraint: sqrt(max(1 - nx²-ny², 0))
      const nzSq = float(1.0)
        .sub(nxRaw.mul(nxRaw))
        .sub(nyRaw.mul(nyRaw)) as unknown as FloatNode
      const nz = sqrt(max(nzSq, float(0.0))) as unknown as FloatNode

      const normal = normalize(vec3(nxRaw, nyRaw, nz)) as unknown as Vec3Node

      // Orthographic view direction always (0,0,1)
      const viewDir = vec3(
        float(0.0),
        float(0.0),
        float(1.0)
      ) as unknown as Vec3Node

      // ── Red-chrome metallic shading ──────────────────────────────────
      // Chrome reflects its environment across the WHOLE surface (not just
      // the rim), so the reflected studio gradient is the body of the metal;
      // a tight specular glint + a sharp fresnel rim sell the gloss.

      // Sharp fresnel rim
      const NdotV = clamp(
        dot(normal, viewDir),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode
      const fresnel = pow(
        float(1.0).sub(NdotV),
        float(4.0)
      ) as unknown as FloatNode

      // Full-surface reflection: red-tinted studio environment mapped by normal.
      // Dark "floor" at drip tips, Kodak red through the middle, hot near-white
      // "sky" reflection at the top sheet.
      const up = clamp(
        normal.y.mul(0.5).add(0.5),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode
      const envFloor = vec3(
        float(0.12),
        float(0.008),
        float(0.03)
      ) as unknown as Vec3Node
      const envMid = vec3(
        float(0.85),
        float(0.05),
        float(0.1)
      ) as unknown as Vec3Node
      const envSky = vec3(
        float(1.0),
        float(0.5),
        float(0.42)
      ) as unknown as Vec3Node
      const envLow = mix(
        envFloor,
        envMid,
        smoothstep(float(0.0), float(0.55), up)
      ) as unknown as Vec3Node
      const envColor = mix(
        envLow,
        envSky,
        smoothstep(float(0.6), float(1.0), up)
      ) as unknown as Vec3Node

      // Tight, hot specular glint (the wet-metal highlight)
      const lightDir = normalize(
        vec3(float(0.5), float(0.85), float(0.7))
      ) as unknown as Vec3Node
      const halfVec = normalize(lightDir.add(viewDir)) as unknown as Vec3Node
      const NdotH = clamp(
        dot(normal, halfVec),
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode
      const specular = pow(NdotH, float(280.0)).mul(2.6) as unknown as FloatNode
      const specColor = vec3(
        float(1.0),
        float(0.92),
        float(0.85)
      ) as unknown as Vec3Node

      // Bright red-white fresnel rim (the chrome edge)
      const rimColor = vec3(
        float(1.0),
        float(0.32),
        float(0.28)
      ) as unknown as Vec3Node

      // Combine: full-surface reflection + rim + specular glint
      const litColor = envColor
        .add(rimColor.mul(fresnel).mul(0.7))
        .add(specColor.mul(specular)) as unknown as Vec3Node

      // Alpha: pure coverage — transparent off the metal
      const alpha = clamp(
        coverage,
        float(0.0),
        float(1.0)
      ) as unknown as FloatNode

      return { litColor, alpha }
    }

    // ------------------------------------------------------------------
    // Main shading node — kept small so TS can infer it without TS2590
    // ------------------------------------------------------------------
    const liquidDripNode = Fn(() => {
      // screenUV: x=0 left→1 right, y=0 bottom→1 top (WebGL convention)
      const sUV = screenUV.toVar()
      const sx = sUV.x.toVar() // 0..1, left to right
      const sy = sUV.y.toVar() // 0..1, bottom to top

      // Compute coverage (curtain + drips)
      const cov = coverageAt(
        sx as unknown as FloatNode,
        sy as unknown as FloatNode
      )

      // Shade: faux normal → fresnel → specular → env gradient → litColor + alpha
      const { litColor, alpha } = shadeDrip(
        cov,
        sx as unknown as FloatNode,
        sy as unknown as FloatNode
      )

      return vec4(litColor, alpha)
    })()

    this.colorNode = liquidDripNode
  }

  // ---------------------------------------------------------------------------
  // Public API — mirrors AnimatedGradientMaterial surface
  // ---------------------------------------------------------------------------

  get time(): number {
    return this._uTime.value as number
  }
  set time(v: number) {
    this._uTime.value = v
  }

  get amplitude(): number {
    return this._uAmplitude.value as number
  }
  set amplitude(v: number) {
    this._uAmplitude.value = v
  }

  // TSL's screenUV is DPR-aware — no-op for API compatibility
  get dpr(): number {
    return 1
  }
  set dpr(_v: number) {
    /* no-op */
  }
}
